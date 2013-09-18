# Cantas

Cantas is a real-time collaborative web application.It used as internal 
productivity tools in Red Hat. we believed this is best of code based for 
learning HTML5/Nodejs/socket.io/backbone.js technology.

## Update news

Current stable: v0.6
new feature:
1. support import trello export board json file.
2. support card image cover
2. support file upload to cantas


## Setup development environment

- rpm requirements:

    ```bash
    sudo yum install -y krb5-devel krb5-libs krb5-workstation
    ```

- install [Nodejs][nodejs] (v0.8.15 preferred), [npm][npm],
  [MongoDB][MongoDB], [Redis][Redis].

    ```bash
    # nodejs & npm
    wget http://nodejs.org/dist/v0.8.15/node-v0.8.15.tar.gz
    tar -xvf node-v0.8.15.tar.gz
    cd node-v0.8.15
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
    git clone git@github.com:xiaods/nodejs-cantas.git
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
    cp settings.json.example settgins.json
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

## TODO

## About
cantas is a real-time collaborative application.

  [nodejs]:http://nodejs.org/    "Nodejs"
  [npm]:http://npmjs.org/    "npm"
  [Redis]:http://redis.io/ "Redis"
  [MongoDB]:http://www.mongodb.org/ "MongoDB"

