import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { Modal } from '../modal/modal';
import { Button } from '../ui/button';
import { useAuth } from '@lib/context/auth-context';

const DummySignInModal = ({
  closeModal,
  open
}: {
  closeModal: () => void;
  open: boolean;
}) => {
  const [publicKey, setPublicKey] = useState('');
  const [fid, setFid] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { handleUserAuthFid } = useAuth();

  const handleSignIn = () => {
    if (publicKey.trim() && fid.trim()) {
      handleUserAuthFid({ fid });

      setSubmitted(true);
      // Here, you can handle storing the public key or any other logic.
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
              Sign in with Public Key
            </Dialog.Title>
            <button onClick={closeModal}>x</button>
          </div>

          <Dialog.Description className='text-light-secondary dark:text-dark-secondary'>
            Enter your public key to sign in.
          </Dialog.Description>
        </div>

        <div className='flex flex-col justify-center gap-4 p-8 pb-4'>
          {!submitted ? (
            <>
              <input
                type='text'
                className='w-full rounded-md border p-2 text-black'
                placeholder='Enter your public key...'
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
                onClick={handleSignIn}
                disabled={!publicKey.trim()}
              >
                Sign In
              </Button>
            </>
          ) : (
            <div className='text-center'>
              <p className='text-lg font-semibold'>Signed in successfully!</p>
              <p className='break-all text-light-secondary dark:text-dark-secondary'>
                Public Key: {publicKey}
              </p>
              <Button
                className='mt-4 bg-gray-600 text-white'
                onClick={() => setSubmitted(false)}
              >
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DummySignInModal;
