# Hypergraph CLI

`hypergraph` is a command-line interface (CLI) tool designed to facilitate various tasks related to project management and deployment using the Hypergraph platform. Below is a comprehensive guide outlining available commands and their options.

## Install

Using npm:

```sh
npm install @hgraph/cli -g
```

## Usage

```sh
hypergraph <auth|build|checkout|collaborator|config|create|deploy|gcloud|generate|project|save> [--help] [--doc]
```

### Commands

- `auth`: Commands for managing authentication and access.
- `build`: Build a project.
- `checkout`: Checkout a project.
- `collaborator`: Administer project collaborators and permissions.
- `config`: View or update configuration.
- `create`: Create a package and other resources.
- `deploy`: Deploy a project.
- `gcloud`: Configure and install tools for Google Cloud.
- `generate`: Generate project models and resolvers using AI.
- `project`: Manage your projects.
- `save`: Save a source file to a given project.

## hypergraph auth

Commands for managing authentication and access.

### `hypergraph auth login`

Access your Hypergraph account by logging in.

```sh
hypergraph auth login [--provider=<GOOGLE|GITHUB>]
```

Options:
- `--provider=<GOOGLE|GITHUB>`: Authenticate using Google or Github credentials.

### `hypergraph auth logout`

Sign out of your account.

```sh
hypergraph auth logout
```

### `hypergraph auth user`

Display information of the currently logged-in user.

```sh
hypergraph auth user
```

## hypergraph build

Build a project.

```sh
hypergraph build --environment=<string> [--api=<string>] [--db-port=<number>] [--clean]
```

Options:
- `--environment=<string>` (Required): Specify the project environment.
- `--api=<string>`: List all API services in the format "name:port" for local exposure.
- `--db-port=<number>`: Expose the database through a specified port, if defined.
- `--clean`: Perform a clean build by removing previous environments, cache, and config.

## hypergraph checkout

Checkout a project.

```sh
hypergraph checkout [--project-id=<string>] [--skip-cache]
```

Options:
- `--project-id=<string>`: Specify the ID of the project to checkout.
- `--skip-cache`: Disable cache (enabled by default).

## hypergraph collaborator

Administer project collaborators and permissions.

### `hypergraph collaborator add`

Add a collaborator to the project.

```sh
hypergraph collaborator add [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Specify the ID of the project.

### `hypergraph collaborator list`

Display contributors within a project.

```sh
hypergraph collaborator list [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Project ID.

### `hypergraph collaborator remove`

Remove a collaborator from the project.

```sh
hypergraph collaborator remove [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Project ID.

## hypergraph config

View or update configuration.

### `hypergraph config remote`

View or update remote server URL.

```sh
hypergraph config remote [url]
```

Arguments:
- `url`: Server URL.

## hypergraph create

Create a package and other resources.

### `hypergraph create package`

Create a package.

```sh
hypergraph create package [name]
```

Arguments:
- `name`: Name of the package.

## hypergraph deploy

Deploy a project.

```sh
hypergraph deploy --environment=<string> [--create] [--clean]
```

Options:
- `--environment=<string>` (Required): Specify the deployment environment.
- `--create`: Create missing resources like cluster, container registry, and certificates as needed.
- `--clean`: Perform a clean build by removing previous environments, cache, and config.

## hypergraph gcloud

Configure and install tools for Google Cloud.

### `hypergraph gcloud setup`

Configure the Google Cloud environment.

```sh
hypergraph gcloud setup --environment=<string>
```

Options:
- `--environment=<string>` (Required): Select the target environment.

### `hypergraph gcloud install`

Install all required libraries for Google Cloud.

```sh
hypergraph gcloud install --environment=<string>
```

Options:
- `--environment=<string>` (Required): Specify the target environment.

## hypergraph generate

Generate project models and resolvers using AI.

```sh
hypergraph generate [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Specify the ID of the project.

## hypergraph project

Manage your projects.

### `hypergraph project create`

Create a project.

```sh
hypergraph project create [project-name]
```

Arguments:
- `project-name`: Name of the project.

### `hypergraph project list`

List all projects.

```sh
hypergraph project list
```

### `hypergraph project remove`

Remove a project.

```sh
hypergraph project remove [--project-id=<string>]
```

Options:
- `--project-id=<string>`: ID of the project to be removed.

## hypergraph save

Save a source file to a given project.

```sh
hypergraph save <source-file> [--project-id=<string>]
```

Arguments:
- `source-file`: Source file(s) to upload. You may use glob patterns.

Options:
- `--project-id=<string>`: Project ID in Hypergraph.
