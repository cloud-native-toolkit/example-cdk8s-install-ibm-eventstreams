import { Yaml } from 'cdk8s';
import { ParameterBuilder, TaskBuilder } from 'cdk8s-pipelines';
import { openshift_client } from 'cdk8s-pipelines-lib';
import { Construct } from 'constructs';

/**
 * This is an example of an object that represents a CatalogSource.
 *
 * @see https://cloud.redhat.com/blog/openshift-4-3-managing-catalog-sources-in-the-openshift-web-console
 * @see https://docs.openshift.com/container-platform/4.13/operators/admin/olm-managing-custom-catalogs.html
 */
export const ibmOperatorCatalog = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'CatalogSource',
  metadata: {
    name: 'ibm-operator-catalog',
    namespace: 'openshift-marketplace',
  },
  spec: {
    displayName: 'IBM Operator Catalog',
    publisher: 'IBM',
    sourceType: 'grpc',
    image: 'icr.io/cpopen/ibm-operator-catalog',
    updateStrategy: {
      registryPoll: {
        interval: '45m',
      },
    },
  },
};

/**
 * This is an example of creating a re-usable object for applying
 * with the `oc` client task. This object could also be created with
 * a function, allowing certain values to be passed into the function.
 */
export const ibmEventStreamsSubscription = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'Subscription',
  metadata: {
    name: 'ibm-eventstreams',
    namespace: 'openshift-operators',
  },
  spec: {
    channel: 'v3.2',
    installPlanApproval: 'Automatic',
    name: 'ibm-eventstreams',
    source: 'ibm-operator-catalog',
    sourceNamespace: 'openshift-marketplace',
    startingCSV: 'ibm-eventstreams.v3.2.4',
  },
};

export const ibmCommonServicesOperator = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'Subscription',
  metadata: {
    name: 'ibm-common-service-operator',
    namespace: 'openshift-operators',
  },
  spec: {
    channel: 'v3',
    installPlanApproval: 'Automatic',
    name: 'ibm-common-service-operator',
    source: 'ibm-operator-catalog',
    sourceNamespace: 'openshift-marketplace',
  },
};

/**
 * Creates a TaskBuilder that can be used to build a task for running an `oc apply -f` command,
 * using the provided object serialized to YAML as the body of the document.
 * @param construct
 * @param taskName
 * @param obj
 */
export function createApplyObjectTask(construct: Construct, taskName: string, obj: any): TaskBuilder {
  return openshift_client(construct, taskName)
    .withStringParam(new ParameterBuilder('SCRIPT')
      .withValue(['cat <<EOF | oc apply -f -', objectToYAML(obj), 'EOF'].join('\n')));
}

/**
 * Creates a task that uses `oc create secret` to create the docker-registry secret with the provided
 * entitlement key.
 * @param construct The parent construct.
 * @param taskName The task name.
 * @param key The entitlement key to use.
 */
export function createEntitlementKeySecret(construct: Construct, taskName: string, projectName: string, key: string): TaskBuilder {
  return openshift_client(construct, taskName)
    .withStringParam(new ParameterBuilder('SCRIPT')
      .withValue(`oc create secret docker-registry ibm-entitlement-key --docker-username=cp --docker-password="${key}" --docker-server="cp.icr.ico" -n ${projectName}`));
}

/**
 * Converts the given object to its YAML representation.
 */
export function objectToYAML(obj: any): string {
  return Yaml.stringify(obj);
}

/**
 * This is an example function that can be used to generate a somewhat random
 * string. It was taken from the https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
 * with modifications for TypeScript.
 *
 * @param length The length of the suffix to generate.
 * @returns A string of random characters with the specified length.
 */
export function makeid(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
