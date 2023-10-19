import { App, Chart, ChartProps } from 'cdk8s';
import { ParameterBuilder, PipelineBuilder, PipelineRunBuilder } from 'cdk8s-pipelines';
import { openshift_client } from 'cdk8s-pipelines-lib';
import { Construct } from 'constructs';
import {
  createApplyObjectTask,
  createEntitlementKeySecret,
  ibmCommonServicesOperator,
  ibmEventStreamsSubscription,
  ibmOperatorCatalog,
  makeid,
} from './common';

export class InstallIBMEventStreamsPipeline extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = {}) {
    super(scope, id, props);

    // Setting up some variables here. This is not strictly necessary, but it allows us
    // to demonstrate how re-usable variables can be used in the pipeline construction.
    const projectName = 'event-automation';

    // Create a new namespace for event automation.
    const createProject = openshift_client(this, 'create-project')
      .withStringParam(new ParameterBuilder('SCRIPT')
        .withValue(`oc create namespace ${projectName}`));

    // Create the task that will register the IBM operator catalog with the cluster
    const registerCatalogSource = createApplyObjectTask(this, 'register-operator-catalog', ibmOperatorCatalog);

    // Create the operator subscription for IBM Core Services, required by Event Streams.
    // See https://www.ibm.com/docs/en/cloud-paks/foundational-services/3.23?topic=319-installing-foundational-services-by-using-cli
    const installIBMCommonServices = createApplyObjectTask(this, 'install-ibm-common-services', ibmCommonServicesOperator);

    // Create the operator subscription for IBM Event Streams
    const installIBMEventStreams = createApplyObjectTask(this, 'install-ibm-eventstreams', ibmEventStreamsSubscription);

    // Create the secret for the entitlement key
    const entitlementKey = process.env.IBM_ENTITLEMENT_KEY || 'REPLACE_ME';
    const createSecret = createEntitlementKeySecret(this, 'create-entitlement-key-secret', projectName, entitlementKey);

    // Configure the pipeline, adding the tasks and giving it a description.
    const pipeline = new PipelineBuilder(this, 'install-ibm-event-streams-pipeline')
      .withDescription('Installs IBM Event Automation')
      .withTask(createProject)
      .withTask(registerCatalogSource)
      .withTask(installIBMCommonServices)
      .withTask(installIBMEventStreams)
      .withTask(createSecret)
    ;

    // This will build the actual Pipeline construct in the form of YAML.
    pipeline.buildPipeline({ includeDependencies: true });

    const generatedSuffix = makeid(8);

    // Okay, now we build a PipelineRun for this pipeline.
    new PipelineRunBuilder(this, `install-ibm-ea-run-${generatedSuffix}`, pipeline)
      .withRunParam('VERSION', '4.13')
      .withWorkspace('kubeconfig-dir', 'pipeline-data', 'config')
      .withWorkspace('manifest-dir', 'pipeline-data', 'manifests')
      .buildPipelineRun({ includeDependencies: true });
  }
}

const app = new App();
new InstallIBMEventStreamsPipeline(app, 'install-ibm-event-streams');
app.synth();
