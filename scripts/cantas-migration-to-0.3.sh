#!/usr/bin/env bash

# Migration Main Script
# Focus on integration with all cantas migrate scripts

NODE=`which node`
NODE_MODULES_PATH=/usr/lib/node_modules/cantas/scripts/migrations

${NODE} ${NODE_MODULES_PATH}/migrationCardAddBoardId.js
${NODE} ${NODE_MODULES_PATH}/migrationCardAssigneesChanged.js
${NODE} ${NODE_MODULES_PATH}/migrationChecklistItemAddCardId.js
${NODE} ${NODE_MODULES_PATH}/initLabelMetadata.js
echo "Y" | ${NODE} ${NODE_MODULES_PATH}/migrateAddLabelsToBoards.js
echo "Y" | ${NODE} ${NODE_MODULES_PATH}/migrateAddLabelsToCards.js
