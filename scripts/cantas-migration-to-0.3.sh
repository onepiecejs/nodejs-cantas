#!/usr/bin/env bash

# Migration Main Script
# Focus on integration with all cantas migrate scripts

NODE=`which node`
NODE_MODULES_PATH=/usr/lib/node_modules/cantas/scripts


${NODE}  ${NODE_MODULES_PATH}/db_migration_card_add_boardId.js

${NODE}  ${NODE_MODULES_PATH}/db_migration_card_assignees_changed.js

${NODE}  ${NODE_MODULES_PATH}/db_migration_checklistItem_add_cardId.js

${NODE}  ${NODE_MODULES_PATH}/db_init_label_metadata.js

echo "Y" | ${NODE}  ${NODE_MODULES_PATH}/migrateAddLabelsToBoards.js

echo "Y" | ${NODE}  ${NODE_MODULES_PATH}/migrateAddLabelsToCards.js
