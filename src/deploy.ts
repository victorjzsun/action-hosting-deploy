/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { exec } from "@actions/exec";

export type SiteDeploy = {
  site: string;
  target: string | undefined;
  url: string;
  expireTime: string;
};

export type ErrorResult = {
  status: "error";
  error: string;
};

export type SuccessResult = {
  status: "success";
  result: { [key: string]: SiteDeploy };
};

export type DeployConfig = {
  projectId: string;
  expires: string;
  channelId: string;
};

export async function deploy(
  firebase: string,
  gacFilename: string,
  deployConfig: DeployConfig
) {
  const { projectId, expires, channelId } = deployConfig;

  let deployOutputBuf: Buffer[] = [];

  try {
    await exec(
      firebase,
      [
        "hosting:channel:deploy",
        channelId,
        //   '--expires', // TODO: expires isn't implemented yet in CLI
        //   expires,
        ...(projectId ? ["--project", projectId] : []),
        "--json", // keep this option in so that we can easily parse the output
        // "--debug", // uncomment this for better error output
      ],
      {
        listeners: {
          stdout(data: Buffer) {
            deployOutputBuf.push(data);
          },
        },
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: gacFilename, // the CLI will automatically authenticate with this env variable set
        },
      }
    );
  } catch (e) {
    console.log(Buffer.concat(deployOutputBuf).toString("utf-8"));
    console.log(e.message);
    throw e;
  }

  const deploymentText = Buffer.concat(deployOutputBuf).toString("utf-8"); // output from the CLI

  const deploymentResult = JSON.parse(deploymentText) as
    | SuccessResult
    | ErrorResult;

  return deploymentResult;
}
