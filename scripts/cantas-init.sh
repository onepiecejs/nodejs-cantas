#!/usr/bin/env bash

# Initial Script
# Now initial collection of label

NODE=`which node`
NODE_MODULES_PATH=/usr/lib/node_modules/cantas/scripts

${NODE}  ${NODE_MODULES_PATH}/db_init_label_metadata.js

