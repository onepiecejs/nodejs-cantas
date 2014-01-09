# Cantas

Cantas is a real-time collaborative web application.This is a side project,
used as internal productivity tool in [Red Hat](https://www.redhat.com/).
We believed this is the best open source project for
learning HTML5/Nodejs/socket.io/backbone.js technology.

Thanks for [all Contributors](AUTHORS.md)

![project screenshot](./public/images/cantas-help-list.gif)

## Update news
### Current stable: v1.0

###new features:

1. Let cantas codebase follow jslint code style convention and pass unit
   testing.
2. Speed up the loading process of the board with a lot of lists
3. Subscribe card activity

## Setup development environment

- rpm requirements:

    ```bash
    sudo yum install -y krb5-devel krb5-libs krb5-workstation
    ```

- install [Nodejs][nodejs], [npm][npm],
  [MongoDB][MongoDB], [Redis][Redis].

    ```bash
    # nodejs & npm
    wget http://nodejs.org/dist/v0.10.22/node-v0.10.22.tar.gz
    tar -xvf node-v0.10.22.tar.gz
    cd node-v0.10.22
    ./configure && make
    sudo make install
    # mongo
    sudo yum install mongodb mongodb-server
    # redis
    sudo yum install redis
    ```
> ***Note:***
> If you got `g++: command not found` while you installing nodejs,
> you can install it by `sudo yum install gcc-c++`.

- checkout source code and update node packages via npm

    ```bash
    git clone git@github.com:onepiecejs/nodejs-cantas.git
    cd nodejs-cantas
    npm install
    ```
- start redis server and mongodb server

    ```bash
    # if you have installed them as services, do
    sudo systemctl start redis
    sudo systemctl start mongod
    # or
    sudo service redis start
    sudo service mongod start
    ```
    ```bash
    # otherwise,
    redis-server &
    && mongod --dbpath=/tmp &
    ```

- start the app

    ```bash
    # update settings values
    cp settings.json.example settings.json

    # setup initalize data
    node scripts/db_init_label_metadata.js

    # start the app
    NODE_ENV=development node app.js
    ```
> ***Note:***
> make sure the `mongod` deamon is running before starting the app.

That's it.


## Resources

- [trello](https://trello.com/)
- [the trello tech talk](http://blog.fogcreek.com/the-trello-tech-stack/)
- [HTML5 pushState](http://diveintohtml5.info/history.html)

## Integration && Test Environment

- [Grunt task to run jasmine unit tests through phantomjs](https://github.com/jasmine-contrib/grunt-jasmine-runner)

### Dependencies

- [Node.js][nodejs]
- [npm][npm]
- [Backbone.js](http://backbonejs.org/)
- [SOCKET.IO](http://socket.io/)
- [Redis][Redis]
- [Mongo][MongoDB]

### Template engine

- [Jade](https://github.com/visionmedia/jade)


## About
cantas is a real-time collaborative application.

  [nodejs]:http://nodejs.org/    "Nodejs"
  [npm]:http://npmjs.org/    "npm"
  [Redis]:http://redis.io/ "Redis"
  [MongoDB]:http://www.mongodb.org/ "MongoDB"

