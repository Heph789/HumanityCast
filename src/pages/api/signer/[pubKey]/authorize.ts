import type { NextApiRequest, NextApiResponse } from 'next';
import { mnemonicToAccount } from 'viem/accounts';
import { AppAuthResponse } from '../../../../lib/types/app-auth';

interface Claims {
  kyc: string;
  age: number;
  custom_claim: string;
}

interface RequestBody {
  subject_address: string;
  claims: Claims;
}

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: 'Farcaster SignedKeyRequestValidator',
  version: '1',
  chainId: 10,
  verifyingContract: '0x00000000fc700472606ed4fa22623acf62c60553'
} as const;

const SIGNED_KEY_REQUEST_TYPE = [
  { name: 'requestFid', type: 'uint256' },
  { name: 'key', type: 'bytes' },
  { name: 'deadline', type: 'uint256' }
] as const;

const apiUrl: string = 'https://issuer.humanity.org/credentials/issue';
// const apiToken: string = 'YOUR_API_KEY';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<AppAuthResponse>
): Promise<void> {
  const { pubKey } = req.query as { pubKey: `0x${string}` };

  const appFid = process.env.APP_FID!;
  const account = mnemonicToAccount(process.env.APP_MNENOMIC!);

  const deadline = Math.floor(Date.now() / 1000) + 86400; // signature is valid for 1 day
  const signature = await account.signTypedData({
    domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
    types: {
      SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE
    },
    primaryType: 'SignedKeyRequest',
    message: {
      requestFid: BigInt(appFid),
      key: pubKey,
      deadline: BigInt(deadline)
    }
  });

  const requestBody: RequestBody = {
    subject_address: account.address,
    claims: {
      kyc: 'passed',
      age: 22,
      custom_claim: 'value'
    }
  };

  const isHumanResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'X-API-Token': process.env.HUMANITY_API_KEY as string,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const isHumanData = await isHumanResponse.json();

  let isHuman: boolean = false;

  if (isHumanData.message == 'Credential issued successfully') {
    isHuman = true;
  }
  res.json({
    result: {
      signature,
      requestFid: parseInt(appFid),
      deadline,
      requestSigner: account.address,
      isHuman: isHuman // Additional parameter added
    }
  });
}
