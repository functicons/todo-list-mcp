#!/bin/bash

# dump-sqlite.sh
# 
# This script dumps the contents of the SQLite database used by the todo-list-mcp server.
# It shows the schema and all data in a human-readable format.

set -e

# Default database path
DB_PATH="${TODO_DATA_PATH:-$HOME/.todo-list-mcp/todos.sqlite}"

# Check if custom path is provided as argument
if [ $# -gt 0 ]; then
    DB_PATH="$1"
fi

echo "=================================================="
echo "Todo List MCP - SQLite Database Dump"
echo "=================================================="
echo "Database: $DB_PATH"
echo ""

# Check if database file exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    echo ""
    echo "Usage: $0 [database-path]"
    echo "Example: $0 ~/.todo-list-mcp/todos.sqlite"
    echo ""
    echo "Make sure to:"
    echo "1. Run the MCP server at least once to create the database"
    echo "2. Use SQLite storage (TODO_DATA_STORE=sqlite)"
    echo "3. Check the path is correct"
    exit 1
fi

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ sqlite3 command not found"
    echo "Please install SQLite3:"
    echo "  - Ubuntu/Debian: sudo apt-get install sqlite3"
    echo "  - macOS: brew install sqlite"
    echo "  - Windows: Download from https://sqlite.org/download.html"
    exit 1
fi

echo "📊 Database Information"
echo "======================"

# Get database file info
echo "File size: $(du -h "$DB_PATH" | cut -f1)"
echo "Last modified: $(stat -c %y "$DB_PATH" 2>/dev/null || stat -f %Sm "$DB_PATH" 2>/dev/null || echo "Unknown")"
echo ""

echo "🏗️  Database Schema"
echo "=================="

# Dump schema
sqlite3 "$DB_PATH" ".schema"
echo ""

echo "📝 Todo Lists"
echo "============="

# Count and show todo lists
LISTS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM todo_lists;")
echo "Total todo lists: $LISTS_COUNT"
echo ""

if [ "$LISTS_COUNT" -gt 0 ]; then
    echo "Todo Lists:"
    sqlite3 "$DB_PATH" -header -column "
        SELECT 
            id,
            name,
            description,
            createdAt,
            updatedAt
        FROM todo_lists 
        ORDER BY createdAt DESC;
    "
    echo ""
fi

echo "📋 Todos"
echo "========"

# Count and show todos
TODOS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM todos;")
ACTIVE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM todos WHERE completedAt IS NULL;")
COMPLETED_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM todos WHERE completedAt IS NOT NULL;")

echo "Total todos: $TODOS_COUNT"
echo "Active todos: $ACTIVE_COUNT"
echo "Completed todos: $COMPLETED_COUNT"
echo ""

if [ "$TODOS_COUNT" -gt 0 ]; then
    echo "All Todos:"
    sqlite3 "$DB_PATH" -header -column "
        SELECT 
            t.id,
            t.listId,
            l.name as listName,
            t.title,
            CASE 
                WHEN t.completedAt IS NULL THEN '⏳ Active'
                ELSE '✅ Completed'
            END as status,
            t.createdAt,
            t.completedAt
        FROM todos t
        LEFT JOIN todo_lists l ON t.listId = l.id
        ORDER BY t.createdAt DESC;
    "
    echo ""
fi

echo "📈 Statistics"
echo "============="

# Additional statistics
echo "Database statistics:"
sqlite3 "$DB_PATH" "
    SELECT 
        'Tables' as metric, 
        COUNT(*) as count 
    FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    
    UNION ALL
    
    SELECT 
        'Indexes' as metric, 
        COUNT(*) as count 
    FROM sqlite_master 
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    
    UNION ALL
    
    SELECT 
        'Todo Lists' as metric,
        COUNT(*) as count
    FROM todo_lists
    
    UNION ALL
    
    SELECT 
        'Total Todos' as metric,
        COUNT(*) as count
    FROM todos
    
    UNION ALL
    
    SELECT 
        'Active Todos' as metric,
        COUNT(*) as count
    FROM todos
    WHERE completedAt IS NULL
    
    UNION ALL
    
    SELECT 
        'Completed Todos' as metric,
        COUNT(*) as count
    FROM todos
    WHERE completedAt IS NOT NULL;
" -header -column

echo ""
echo "🔍 Advanced Queries"
echo "=================="

# Show todos per list
echo "Todos per list:"
sqlite3 "$DB_PATH" -header -column "
    SELECT 
        l.name as 'List Name',
        COUNT(t.id) as 'Total Todos',
        COUNT(CASE WHEN t.completedAt IS NULL THEN 1 END) as 'Active',
        COUNT(CASE WHEN t.completedAt IS NOT NULL THEN 1 END) as 'Completed'
    FROM todo_lists l
    LEFT JOIN todos t ON l.id = t.listId
    GROUP BY l.id, l.name
    ORDER BY COUNT(t.id) DESC;
"

echo ""
echo "Recent activity (last 10 todos):"
sqlite3 "$DB_PATH" -header -column "
    SELECT 
        t.title,
        l.name as 'List',
        CASE 
            WHEN t.completedAt IS NULL THEN '⏳ Active'
            ELSE '✅ Completed'
        END as status,
        t.createdAt
    FROM todos t
    LEFT JOIN todo_lists l ON t.listId = l.id
    ORDER BY t.createdAt DESC
    LIMIT 10;
"

echo ""
echo "=================================================="
echo "✅ Database dump completed"
echo "=================================================="