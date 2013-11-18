/**
 * Model Permission
 *
 * name: String read,write,all
 */

(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var PermissionSchema;

  PermissionSchema = new Schema({
    idMember: ObjectId,
    /**
     *  object logic view: such as: global,board,member,organization
     */
    scope: { type: String },
    /**
     *  permission only have some types: read,write,all
     *  Suppose Object(such as Board) trigger CloseBoard Action,
     *  the permission will assign to the actual user.
     *  we need design *token* logic here,and design backend service
     *  to directly interact with mongo.
     *  every Action will contains permission authorize and Optional data value.
     *  REF: https://trello.com/docs/api/board/index.html#put-1-boards-board-id-closed
     *
     *  "data": [{
     *    "idModel": "*",
     *    "scope": "global",
     *    "permission": "read"
     *  }]
     *  or
     *
     *  "data": [{
     *    "idModel": "4eea4ffc91e31d1746000046",
     *    "scope": "board",
     *    "permission": "read"
     *  },{
     *    "idModel": "4ee7deffe582acdec80000ac",
     *    "scope": "board",
     *    "permission": "write"
     *  },{
     *    "idModel": "4ee7deffe582acdec80000ac",
     *    "scope": "board",
     *    "permission": "all"
     *  }
     *  ]
     *
     */
    data: { type: [], default: [] },
    created: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Permission', PermissionSchema);

}(module));
