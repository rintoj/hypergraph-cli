# Hypergraph CLI

`hypergraph` is a command-line interface (CLI) tool designed to facilitate various tasks related to project management, deployment, GraphQL validation, and design system integration using the Hypergraph platform.

## Install

Using npm:

```sh
npm install @hgraph/cli -g
```

Using yarn:

```sh
yarn global add @hgraph/cli
```

## Usage

```sh
hypergraph <auth|build|checkout|collaborator|config|create|deploy|figma|gcloud|generate|graphql|project|save> [--help] [--doc]
```

### Commands

- `auth`: Commands for managing authentication and access
- `build`: Build a project
- `checkout`: Checkout a project
- `collaborator`: Administer project collaborators and permissions
- `config`: View or update configuration
- `create`: Create a package and other resources
- `deploy`: Deploy a project
- `figma`: Tools to handle Figma imports and design tokens
- `gcloud`: Configure and install tools for Google Cloud
- `generate`: Generate project models and resolvers using AI
- `graphql`: GraphQL utilities and validation tools
- `project`: Manage your projects
- `save`: Save a source file to a given project

## Authentication Commands

### `hypergraph auth login`

Access your Hypergraph account by logging in.

```sh
hypergraph auth login [--provider=<GOOGLE|GITHUB>]
```

Options:
- `--provider=<GOOGLE|GITHUB>`: Authenticate using Google or Github credentials

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

## Build & Deploy Commands

### `hypergraph build`

Build a project.

```sh
hypergraph build --environment=<string> [--api=<string>] [--db-port=<number>] [--clean]
```

Options:
- `--environment=<string>` (Required): Specify the project environment
- `--api=<string>`: List all API services in the format "name:port" for local exposure
- `--db-port=<number>`: Expose the database through a specified port, if defined
- `--clean`: Perform a clean build by removing previous environments, cache, and config

### `hypergraph deploy`

Deploy a project.

```sh
hypergraph deploy --environment=<string> [--create] [--clean]
```

Options:
- `--environment=<string>` (Required): Specify the deployment environment
- `--create`: Create missing resources like cluster, container registry, and certificates as needed
- `--clean`: Perform a clean build by removing previous environments, cache, and config

## Project Management

### `hypergraph project create`

Create a project.

```sh
hypergraph project create [project-name]
```

Arguments:
- `project-name`: Name of the project

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
- `--project-id=<string>`: ID of the project to be removed

### `hypergraph checkout`

Checkout a project.

```sh
hypergraph checkout [--project-id=<string>] [--skip-cache]
```

Options:
- `--project-id=<string>`: Specify the ID of the project to checkout
- `--skip-cache`: Disable cache (enabled by default)

## GraphQL Utilities

### `hypergraph graphql validate`

Validate GraphQL module structure and naming conventions using TypeScript AST analysis.

```sh
hypergraph graphql validate [--path=<string>] [--strict] [--json]
```

Options:
- `--path=<string>`: Path to the project root (defaults to current directory)
- `--strict`: Treat warnings as errors
- `--json`: Output results as JSON for CI/CD integration

Features:
- TypeScript AST-based validation for accuracy
- Intelligent computed field detection via resolver analysis
- Support for TypeORM decorators and relations
- GitIgnore support
- Syntax-highlighted error output with code snippets

### `hypergraph graphql rules`

Display GraphQL validation rules and documentation.

```sh
hypergraph graphql rules
```

## Figma Integration

### `hypergraph figma token`

Set personal access token to configure Figma access.

```sh
hypergraph figma token [token]
```

Arguments:
- `token`: Your Figma personal access token

### `hypergraph figma user`

Get current Figma user information.

```sh
hypergraph figma user
```

### `hypergraph figma import`

Import design tokens and assets from a Figma URL.

```sh
hypergraph figma import <url>
```

Arguments:
- `url`: Figma file URL to import from

## Collaborator Management

### `hypergraph collaborator add`

Add a collaborator to the project.

```sh
hypergraph collaborator add [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Specify the ID of the project

### `hypergraph collaborator list`

Display contributors within a project.

```sh
hypergraph collaborator list [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Project ID

### `hypergraph collaborator remove`

Remove a collaborator from the project.

```sh
hypergraph collaborator remove [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Project ID

## Google Cloud Configuration

### `hypergraph gcloud setup`

Configure the Google Cloud environment.

```sh
hypergraph gcloud setup --environment=<string>
```

Options:
- `--environment=<string>` (Required): Select the target environment

### `hypergraph gcloud install`

Install all required libraries for Google Cloud.

```sh
hypergraph gcloud install --environment=<string>
```

Options:
- `--environment=<string>` (Required): Specify the target environment

## Other Commands

### `hypergraph config remote`

View or update remote server URL.

```sh
hypergraph config remote [url]
```

Arguments:
- `url`: Server URL

### `hypergraph create package`

Create a package.

```sh
hypergraph create package [name]
```

Arguments:
- `name`: Name of the package

### `hypergraph generate`

Generate project models and resolvers using AI.

```sh
hypergraph generate [--project-id=<string>]
```

Options:
- `--project-id=<string>`: Specify the ID of the project

### `hypergraph save`

Save a source file to a given project.

```sh
hypergraph save <source-file> [--project-id=<string>]
```

Arguments:
- `source-file`: Source file(s) to upload. You may use glob patterns

Options:
- `--project-id=<string>`: Project ID in Hypergraph

## Development

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```sh
# Clone the repository
git clone https://github.com/rintoj/hypergraph-cli.git
cd hypergraph-cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Testing

```sh
# Run tests
npm test

# Run linter
npm run lint

# Run GraphQL validation on the project itself
node dist/index.js graphql validate
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs on every push and pull request to the main branch
  - Tests on Node.js 18.x and 20.x
  - Runs linter, tests, and build
  - Validates GraphQL structure

- **Publish Pipeline**: Automatically publishes to npm when a release is created

## License

MIT

## Support

For issues and feature requests, please visit the [GitHub Issues](https://github.com/rintoj/hypergraph-cli/issues) page.