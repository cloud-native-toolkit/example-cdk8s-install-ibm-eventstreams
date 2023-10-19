import { cdk8s } from 'projen';
const project = new cdk8s.Cdk8sTypeScriptApp({
  cdk8sVersion: '2.64.12',
  defaultReleaseBranch: 'main',
  name: 'example-cdk8s-pipeline-typescript',
  projenrcTs: true,
  gitignore: [
    '.vscode/',
    '.idea/',
  ],
  deps: [
    'cdk8s-pipelines',
    'cdk8s-pipelines-lib',
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
