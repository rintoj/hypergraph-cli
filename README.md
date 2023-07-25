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
hypergraph   <auth|config|checkout|build|save> [--help]

COMMANDS

auth       Authentication commands

config     View or update configuration

checkout   Checkout a project

build      Build a project

save       Save a source file to a given project

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

### Checkout

This command will let you select a project from your account and download that to local system.

```sh
hypergraph checkout   [--project-id=<string>] [--skip-cache] [--help]

OPTIONS

--project-id=<string>   Id of the project to checkout

--skip-cache            Disable cache. By default it is enabled

--help                  Show help
```

### Build

```sh
hypergraph build   --environment=<string> [--api-port=<number>] [--db-port=<number>] [--clean] [--help]

OPTIONS

--environment=<string>   [Required] Environment

--api-port=<number>      Will expose the graphql API through a port, if defined

--db-port=<number>       Will expose the database through a port, if defined

--clean                  Do a clean build by removing previous environments, cache and config

--help                   Show help
```

### Save

```sh
hypergraph save   <source-file> [--project-id=<string>] [--help]

ARGUMENTS

source-file             Source file(s) to upload. Separate each name with a coma

OPTIONS

--project-id=<string>   Project ID in Hypergraph

--help                  Show help
```
