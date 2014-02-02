openmafia
=========

openmafia is a simple, open source online version of the popular party game [Mafia](http://en.wikipedia.org/wiki/Mafia_%28party_game%29), using a lightweight Node.js/Socket.IO back-end for fast and responsive gameplay.

Instructions
------------

Download the source and navigate to the folder. Install the package's dependencies using
```bash
$ npm install
```
then run a server with

```bash
$ node server.js
```
Clients can then connect on port 8080 (or you can set a PORT environment variable).

Currently, one server process functions as one game room, and the server must be restarted between games. A lobby system is coming soon.

Options
-------

You can use
```bash
$ node server.js --debug
```
to run the server in debug mode. This will increase the Socket.IO logging level and automatically assign nicknames to players based on their socket ID, so you don't have to manually set up every player when testing.
