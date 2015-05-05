/*
 * This migration script should run in mongo.
 *
 * Downgrade database from v1.1 to v1.0.2
 */

/*global
   db
 */

// 1. Remove displayName
db.users.update({}, {$unset: {displayName: ""}}, {multi: true});

// 2. Restore fullname and username from backup
db.users_backup_v1_0_2_v1_1.find().forEach(function(backupUser) {
  db.users.update({_id: backupUser.original_id}, {$set: {
    username: backupUser.username,
    fullname: backupUser.fullname
  }});
});

db.users.ensureIndex({username: 1},
                     {name: "idx_unique_username", unique: true, background: true});
