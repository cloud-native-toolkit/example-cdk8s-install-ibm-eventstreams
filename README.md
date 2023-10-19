# Example Pipeline using CDK8s

This is an example pipeline using both the [cdk8s-pipelines](https://github.com/cloud-native-toolkit/cdk8s-pipelines) 
and the [cdk8s-pipelines-lib](https://github.com/cloud-native-toolkit/cdk8s-pipelines-lib) construct libraries. 
This particular example installs [IBM Event Streams](https://ibm.github.io/event-automation/es/about/overview/)
by automating the manual steps found at 
"[Installing on OpenShift Container Platform](https://ibm.github.io/event-automation/es/installing/installing/)".

For more information about cdk8s, see https://cdk8s.io/docs/latest/.

Find more community-developed constructs at [Contruct Hub](https://constructs.dev/).

## Getting prepared

To run the latest pipeline found in the [Releases](./releases), you will need 
[Red Hat OpenShift](https://www.redhat.com/en/technologies/cloud-computing/openshift) 
installed with the [Red Hat OpenShift Pipelines](https://www.redhat.com/en/technologies/cloud-computing/openshift/pipelines)
[operator installed](https://docs.openshift.com/container-platform/4.13/operators/user/olm-installing-operators-in-namespace.html). 
The versions tested with this repository are version 4.13 of OpenShift and 1.11
of OpenShift Pipelines.

Once you have access to an OpenShift cluster and have Red Hat OpenShift Pipelines installed, you can
build and run this example.

## Understanding the example pipeline

This example pipeline is very simple--it only has three tasks--but it demonstrates a few techniques that are very
useful for building re-usable and modular pipelines that offer speed of development and consistency.

The [`common.ts`](src/common.ts) file contains sample re-usable functions and objects. 
You can develop your own functions and objects in a construct library that is re-used throughout your enterprise.

The example pipeline has three tasks:

1. A task that _creates a project (namespace)_.
1. A task that _adds the IBM Operator Catalog_ to the OpenShift catalog sources.
1. A task that _installs the IBM Common Services_ operator.
1. A task that _installs the IBM Event Streams_ operator.
1. A task that _creates the IBM entitlement key secret_.


The next sections will provide an overview of these tasks, all of which are based on the 
[openshift-client](https://hub.tekton.dev/tekton/task/openshift-client) task from [Tekton Hub](https://hub.tekton.dev/).
These tasks are available automatically when you include [cdk8s-pipeline-lib](https://github.com/cloud-native-toolkit/cdk8s-pipelines-lib).

### Task: creating a project

The first step in the pipeline is to create a project for `event-automation` 
(see ["Installing on OpenShift Container Platform", "Create a project (namespace)"](https://ibm.github.io/event-automation/es/installing/installing/)).

```typescript
// these are the imports you will need...
// import { openshift_client } from 'cdk8s-pipelines-lib';
// import { ParameterBuilder } from 'cdk8s-pipelines';

const createProject = openshift_client(this, 'create-project')
  .withStringParam(new ParameterBuilder('SCRIPT')
    .withValue(`oc create namespace ${projectName}`));
```

When the `npx projen build` command builds this step in the pipeline, the `SCRIPT` value tells the task to run the
`oc create namespace` command as shown here.

```yaml
  tasks:
    - name: create-project
      taskRef:
        name: openshift-client
      params:
        - name: SCRIPT
          value: oc create namespace event-automation
        - name: VERSION
          value: $(params.VERSION)
      workspaces:
        - name: manifest-dir
          workspace: manifest-dir
        - name: kubeconfig-dir
          workspace: kubeconfig-dir
```

### Task: adding the IBM operator catalog source

The next step demonstrates an example of using functions to create re-usable `TaskBuilder`s that
can be used over and over with minor changes for consistency. The `createApplyObjectTask` function
returns the `TaskBuilder` with the task ID and the object serialized to YAML as the parameters.

```typescript
// these are the imports you will need...
// import { createApplyObjectTask, ibmOperatorCatalog } from './common';

// Create the task that will register the IBM operator catalog with the cluster
const registerCatalogSource = createApplyObjectTask(
  this,
  'register-operator-catalog',
  ibmOperatorCatalog,
);
```

The `createApplyObjectTask` creates a `TaskBuilder` that uses the provided object
(`ibmOperatorCatalog`) as the YAML to apply with the `oc apply` command.

### Task: installing the operators

Installing the two operators re-use the same `createApplyObjectTask` function, this time using the
`ibmCommonServicesOperator` and `ibmEventStreamsSubscription` objects.

### Task: creating the secret

The `createEntitlementKeySecret` function creates a `TaskBuilder` that uses the _openshift_client_
from Tekton Hub to run a command to create the docker registry secret with the IBM entitlement key.
if you build this example locally, the pipeline will automatically insert the value of the
`IBM_ENTITLEMENT_SECRET` environment varialbe, if it is defined.

### Pipeline: putting it all together

The tasks must run in a `Pipeline`, so you use a `PipelineBuilder` to create the `Pipeline`
with a `description` and add `Tasks` to it using the `addTask` function, passing in the 
`TaskBuilder`s that you have created, as shown here:

```typescript
// these are the imports you will need...
// import { PipelineBuilder } from 'cdk8s-pipelines';

// Configure the pipeline, adding the tasks and giving it a description.
const pipeline = new PipelineBuilder(this, 'install-ibm-event-streams-pipeline')
  .withDescription('Installs IBM Event Automation')
  .withTask(createProject)
  .withTask(registerCatalogSource)
  .withTask(installIBMEventStreams)
;
```

The `buildPipeline` function builds the pipeline, which in cdk8s construct terms configures
the objects so that `cdk synth` knows how to generate the YAML configuration.

```typescript
// This will build the actual Pipeline construct in the form of YAML.
pipeline.buildPipeline({ includeDependencies: true });
```

Using `includeDependencies` here will generate any of the dependent objects, such as `Task` objects,
in the generated YAML. This is very useful if you have used the `TaskBuilder` to create your own
custom tasks and want to just apply a single document to configure your custom tasks _and_ the pipeline 
that uses them.

### PipelineRun: running the pipeline

Once you create the `Pipeline`, you use a `PipelineRun` to run the pipeline. The `PipelineRunBuilder`
provides an easy way to generate this `PipelineRun` and includes build-time checking to make sure
that you have defined all of the required parameters and workspaces.

## Building the example locally

The [projen](https://github.com/projen/projen) tool was used to create this project. So, the `npx projen build`
command will build the project correctly, including calling `cdk synth` on your behalf to generate
the output YAML. This YAML is generated in the _dist_ folder in this project.

## Building your own pipeline

If you would like to create your own pipline, similar to this project, follow these basic steps:

1. Create a new cdk8s project by using the command:
    ```
    npx projen new cdk8s-app-ts
    ```
2. Add the `cdk8s-pipelines` and, optionally, the `cdk8s-pipelines-lib` (for tasks generated from Tekton Hub) libraries
by modifying `.projenrc.ts` to include the following lines:
    ```typescript
    deps: [
      'cdk8s-pipelines',
      'cdk8s-pipelines-lib',
    ], /* Runtime dependencies of this module. */
    ```
3. Run `npx projen` to re-generate the project files.
4. Add your own code to the _src/main.ts_ file.
5. Run `npx projen build` to generate the YAML file.

## Incorporating into a build process

The `npx projen build` command generates the output in the _dist_ folder. You can configure your build process to 
run this command, then include the output as a release in the project. Using this technique, you now have versioned 
pipeline files.

You can see an example of this in action in this project, as well as in the 
[example-cdk-aws-ec2-vm](https://github.ibm.com/Nathan-Good/example-cdk-aws-ec2-vm) project.
