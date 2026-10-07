# river-levels

## Getting Started

```sh
yarn install
npx projen build
```

## GitHub Configuration

All pull requests are merged by the [Mergify](https://mergify.com) merge queue, configured in `.mergify.yml`. Once a pull request's checks pass, Mergify queues it, brings it up to date with the default branch, waits for the checks again and squash merges it. Draft pull requests and those labelled `do-not-merge` are not merged.

The repository must be configured as below so that nothing can be merged without going through the queue.

### Mergify

Install the [Mergify GitHub App](https://github.com/apps/mergify) and give it access to this repository.

### Pull request settings

In **Settings → General → Pull Requests**:
* Allow squash merging only (untick merge commits and rebase merging), matching the queue's merge method.
* Untick **Allow auto-merge**, because GitHub's own auto-merge merges outside the queue.
* Tick **Automatically delete head branches**.

### Code scanning

CodeQL runs from `.github/workflows/codeql.yml`, which is managed by projen. In **Settings → Advanced Security**, leave CodeQL **Default setup** off, because it cannot run alongside this workflow. Under **Protection rules**, keep the **Check run failure threshold** at **High or higher** for security alerts and **Errors** for other alerts, as this decides whether the `CodeQL` check fails. Private repositories also need GitHub Code Security enabled there for code scanning results to be uploaded.

### Branch ruleset

In **Settings → Rules → Rulesets**, create a branch ruleset with enforcement **Active** that targets the default branch, and set:
* **Bypass list**: the **Mergify** app only, in **Exempt** mode. Do not add admins or other roles, as anyone on this list can merge without the queue.
* **Restrict updates**: only bypass actors can update the branch, so pull requests cannot be merged from the GitHub UI or CLI and commits cannot be pushed directly.
* **Restrict deletions** and **Block force pushes**.
* **Require a pull request before merging**, with 0 required approvals.
* **Require status checks to pass**, listing the checks that `.mergify.yml` waits for: `build`. Leave **Require branches to be up to date before merging** unticked, as the queue already updates and retests each pull request.
* **Require code scanning results**, with the tool **CodeQL**, security alerts set to **High or higher** and alerts set to **Errors**. Mergify is exempt from this rule, so `.mergify.yml` also waits for the `CodeQL` check instead.

Do not enable GitHub's own **Require merge queue** rule, as it competes with Mergify.

If the queue is unavailable and a change has to be merged, add yourself to the bypass list temporarily and remove yourself afterwards.

## CDK

On first run of a CDK installation:

```sh
npx cdk bootstrap
```

Build the project
```sh
npx projen build
```

Deploy the CDK stack
```sh
npx projen deploy
```

## Documentation

- [Infrastructure](docs/infrastructure.md): architecture, data flow, resources, IAM and deployment