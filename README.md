openmafia [![Dependency Status](https://gemnasium.com/rustinlee/openmafia.svg)](https://gemnasium.com/rustinlee/openmafia)
=========

![Screenshot of openmafia v0.3.0](http://i.imgur.com/YkxPWwr.png)

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

`--custom` followed by more than 3 valid non-hyphenated role names will initialize a game with a custom setup, counting each argument as a role. For example, to play a game with 3 villagers, 2 mafiosi and 1 doctor, use the following command:
```bash
$ node server.js --custom villager villager villager mafioso mafioso doctor
```


`--debug` runs the server in debug mode. This will increase the Socket.IO logging level and automatically assign nicknames to players based on their socket ID, so you don't have to manually set up every player when testing.

`--countdown` or `-t` specifies the amount of time to wait in seconds before launching a game once the minimum number of players have joined. Defaults to 10 for a normal game or 3 when in debug mode.
