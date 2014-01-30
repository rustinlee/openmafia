openmafia
=========

openmafia is a simple, open source online version of the popular party game [Mafia](http://en.wikipedia.org/wiki/Mafia_%28party_game%29), using a lightweight Node.js/Socket.io back-end for fast and responsive gameplay.

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