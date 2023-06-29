# hypergraph-graphql

## Install

Using npm:

```sh
npm install hypergraph-graphql
```

Using yarn:

```sh
yarn add hypergraph-graphql
```

## Usage

```ts
ObjectType()
class User {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string

  @Field({ nullable: true })
  bio?: string
}
```
