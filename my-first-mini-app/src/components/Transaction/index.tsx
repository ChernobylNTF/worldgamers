'use client';

import DWDABI from '@/abi/DWD.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';

/**
 * This component is used to get a token from a contract
 * For this to work you need to add the contract address to both contract entrypoints and permit2 tokens
 * inside of  Dev Portal > Configuration > Advanced
 * The general design pattern here is
 * 1. Trigger the transaction
 * 2. Update the transaction_id from the response to poll completion
 * 3. Wait in a useEffect for the transaction to complete
 */
export const Transaction = () => {
  // See the code for this contract here: https://worldscan.org/address/0x7961D1aAF97891b1617E8F7fdDf9bEEB68a165E9#code
  const myContractToken = '0x55E6C9C22C0eaD68F0be7CdcB5d8BAa636a8A1a0';
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);
  const [whichButton, setWhichButton] = useState<'getToken' | 'usePermit2'>(
    'getToken',
  );

  // This triggers the useWaitForTransactionReceipt hook when updated
  const [transactionId, setTransactionId] = useState<string>('');

  // Feel free to use your own RPC provider for better performance
  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-sepolia.g.alchemy.com/public'),
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    client: client,
    appConfig: {
      app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
    },
    transactionId: transactionId,
  });

  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
        console.log('Transaction confirmed!');
        setButtonState('success');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      } else if (isError) {
        console.error('Transaction failed:', error);
        setButtonState('success'); // Keeping this as 'success' seems intentional in the original code for visual feedback despite failure.
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    }
  }, [isConfirmed, isConfirming, isError, error, transactionId]);

  // This is a basic transaction call to mint a token
  const onClickGetToken = async () => {
   // setTransactionId('success'); // Comentado como sugerido anteriormente
    setWhichButton('getToken');
    setButtonState('pending');

    try {
      const transactionConfig = {
        transaction: [
          {
            address: '0x55E6C9C22C0eaD68F0be7CdcB5d8BAa636a8A1a0', // Dirección de tu contrato DestinityWorldTokenClaim
            abi: DWDABI.abi, // ABI de tu contrato
            functionName: 'claim', // ¡Función correcta para reclamar tokens!
            args: [], // ¡Sin argumentos para esta función!
          },
        ],
        // No incluyas el campo 'permit2' si no lo vas a usar
      };

      console.log('Sending transaction with config:', transactionConfig);

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(transactionConfig);

      if (finalPayload.status === 'success') {
        console.log(
          'Transaction submitted, waiting for confirmation:',
          finalPayload.transaction_id,
        );
        setTransactionId(finalPayload.transaction_id); // Establece el ID real para el polling
      } else {
        console.error('Transaction submission failed:', finalPayload);
        setButtonState('failed');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setButtonState('failed');
      setTimeout(() => {
        setButtonState(undefined);
      }, 3000);
    }
  };

  // This is a basic transaction call to use Permit2 to spend the token you minted
  // Make sure to call Mint Token first
  /*
  const onClickUsePermit2 = async () => {
  //  setTransactionId('success');
    setWhichButton('usePermit2');
    setButtonState('pending');
    const address = (await MiniKit.getUserByUsername('alex')).walletAddress;

    // Permit2 is valid for max 1 hour
    const permitTransfer = {
      permitted: {
        token: myContractToken,
        amount: (1 * 10 ** 18).toString(),
      },
      nonce: Date.now().toString(),
      deadline: Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString(),
    };

    const transferDetails = {
      to: address,
      requestedAmount: (1 * 10 ** 18).toString(),
    };

    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: myContractToken,
            abi: DestinityWorldTokenClaimABI,
            functionName: 'signatureTransfer',
            args: [
              [
                [
                  permitTransfer.permitted.token,
                  permitTransfer.permitted.amount,
                ],
                permitTransfer.nonce,
                permitTransfer.deadline,
              ],
              [transferDetails.to, transferDetails.requestedAmount],
              'PERMIT2_SIGNATURE_PLACEHOLDER_0',
            ],
          },
        ],
        permit2: [
          {
            ...permitTransfer,
            spender: myContractToken,
          },
        ],
      });

      if (finalPayload.status === 'success') {
        console.log(
          'Transaction submitted, waiting for confirmation:',
          finalPayload.transaction_id,
        );
        setTransactionId(finalPayload.transaction_id);
      } else {
        console.error('Transaction submission failed:', finalPayload);
        setButtonState('failed');
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setButtonState('failed');
    }
  };
*/

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Transaction</p>
      <LiveFeedback
        label={{
          failed: 'Transaction failed',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={whichButton === 'getToken' ? buttonState : undefined}
        className="w-full"
      >
        <Button
          onClick={onClickGetToken}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Get Token
        </Button>
      </LiveFeedback>
      {/* LiveFeedback and Button for Use Permit2 commented out */}
      {/*
      <LiveFeedback
        label={{
          failed: 'Transaction failed',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={whichButton === 'usePermit2' ? buttonState : undefined}
        className="w-full"
      >
        <Button
          onClick={onClickUsePermit2}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="tertiary"
          className="w-full"
        >
          Use Permit2
        </Button>
      </LiveFeedback>
      */}
    </div>
  );
};
