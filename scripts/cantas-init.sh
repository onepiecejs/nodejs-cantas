#!/usr/bin/env bash

# Initial Script
# Now initial collection of label

NODE=`which node`
NODE_MODULES_PATH=/usr/lib/node_modules/cantas/scripts/migrations

${NODE} ${NODE_MODULES_PATH}/initLabelMetadata.js
