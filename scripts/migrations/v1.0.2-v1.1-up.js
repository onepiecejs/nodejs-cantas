/*
 * This migration script should run in mongo.
 *
 * Upgrade database from v1.0.2 to v1.1
 */

/*global
   db
 */

// 1. Backup users' original values in case something goes wrong.
db.users.find().forEach(function(user) {
  db.users_backup_v1_0_2_v1_1.insert([
    {
      original_id: user._id,
      username: user.username,
      fullname: user.fullname,
      email: user.email
    }
  ]);
});

// 2. Insert new field displayName to db.users

db.users.find().forEach(function(user) {
  var displayName = user.fullname;
  if (displayName === null) {
    displayName = user.email.split('@')[0];
  }

  db.users.update({_id: user._id},
                  {$set: {displayName: displayName}},
                  {multi: true});
});

// 3. Drop unused fields
db.users.dropIndex("username_1");
db.users.update({}, {$unset: {username: ""}}, {multi: true});
db.users.update({}, {$unset: {fullname: ""}}, {multi: true});
