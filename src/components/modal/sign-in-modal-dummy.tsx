import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { Modal } from '../modal/modal';
import { Button } from '../ui/button';
import { useAuth } from '@lib/context/auth-context';

interface Claims {
  kyc: string;
  age: number;
  custom_claim: string;
}

interface RequestBody {
  subject_address: string;
  claims: Claims;
}

const DummySignInModal = ({
  closeModal,
  open
}: {
  closeModal: () => void;
  open: boolean;
}) => {
  const [publicKey, setPublicKey] = useState('');
  const [fid, setFid] = useState('');
  const [step, setStep] = useState(1);
  const valid = !!fid.trim() && !!publicKey.trim();

  const { handleUserAuthFid } = useAuth();

  const handleSignIn = () => {
    if (valid) {
      const requestBody: RequestBody = {
        subject_address: '0x0fa4adf7830a048c285e981ba5d57c51604c917f',
        claims: {
          kyc: 'passed',
          age: 22,
          custom_claim: 'value'
        }
      };

      const apiUrl: string = 'https://issuer.humanity.org/credentials/issue';

      console.log('api key: ', process.env.NEXT_PUBLIC_HUMANITY_API_KEY);

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-API-Token': process.env.NEXT_PUBLIC_HUMANITY_API_KEY as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }).then(async (res) => {
        const isHumanData = await res.json();
        console.log('isHumanData:', isHumanData);

        let isHuman: boolean = false;

        if (isHumanData.message == 'Credential issued successfully') {
          isHuman = true;
        }
        handleUserAuthFid({ fid, isHuman });
      });
    }
  };

  const nextStep = () => {
    if (fid.trim()) {
      setStep(2);
    }
  };

  return (
    <Modal
      className='flex items-start justify-center'
      modalClassName='bg-main-background rounded-2xl max-w-xl p-4 overflow-hidden flex justify-center'
      open={open}
      closeModal={closeModal}
    >
      <div>
        <div className='flex flex-col gap-2'>
          <div className='flex'>
            <Dialog.Title className='flex-grow text-xl font-bold'>
              {step === 1 ? 'Sign in with Public Key' : 'Verify Your Humanity'}
            </Dialog.Title>
            <button onClick={closeModal}>x</button>
          </div>
          <Dialog.Description className='text-light-secondary dark:text-dark-secondary'>
            {step === 1
              ? 'Enter your public key to sign in.'
              : 'Please verify that you are human.'}
          </Dialog.Description>
        </div>
        <div className='flex flex-col justify-center gap-4 p-8 pb-4'>
          {step === 1 ? (
            <>
              <input
                type='text'
                className='w-full rounded-md border p-2 text-black'
                placeholder='Enter your pub key...'
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
              <input
                type='text'
                className='w-full rounded-md border p-2 text-black'
                placeholder='Enter your fid...'
                value={fid}
                onChange={(e) => setFid(e.target.value)}
              />
              <Button
                className='accent-tab flex items-center justify-center bg-main-accent font-bold text-white enabled:hover:bg-main-accent/90 enabled:active:bg-main-accent/75'
                onClick={nextStep}
                disabled={!valid}
              >
                Continue
              </Button>
            </>
          ) : (
            <div className='text-center'>
              <Button
                className='accent-tab flex items-center justify-center bg-main-accent font-bold text-white enabled:hover:bg-main-accent/90 enabled:active:bg-main-accent/75'
                onClick={handleSignIn}
                disabled={!valid}
              >
                Humanity Protocol Verification
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DummySignInModal;
