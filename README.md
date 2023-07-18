# Hypergraph CLI

Hypergraph CLI package is named as `@hgraph/cli` and should be installed globally to access and
configure Hypergraph projects, to build and to run it.

## Install

Using npm:

```sh
npm install @hgraph/cli -g
```

## Usage

To run hypergraph cli, use the following command.

```sh
hypergraph   <auth|config|project> [--help]

COMMANDS

auth       Authentication commands

config     View or update configuration

project    View the selected project or select a project

OPTIONS

--help     Show help

```

### Auth

```sh
hypergraph auth   <login|logout|user> [--help]

COMMANDS

login       Sign in to your account

logout      Sign out of your account

user        Show the logged in user
```

### Config

```sh
hypergraph config   <remote> [--help]

COMMANDS

remote     View or update remote server URL
```

### Project

This command will let you select a project from your account. You must be logged in to access the
projects.

```sh
hypergraph project   [--view] [--help]

OPTIONS

--view    Show the selected project

--help    Show help
```
