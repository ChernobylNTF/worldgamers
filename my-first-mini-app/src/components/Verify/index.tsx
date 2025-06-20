'use client';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { useState } from 'react';

/**
 * This component is an example of how to use World ID in Mini Apps
 * Minikit commands must be used on client components
 * It's critical you verify the proof on the server side
 * Read More: https://docs.world.org/mini-apps/commands/verifying-the-proof
 */
// Modificado para aceptar la prop onSuccess
export const Verify = ({ onSuccess }: { onSuccess: () => void }) => {
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);

  const [whichVerification, setWhichVerification] = useState<VerificationLevel>(
    VerificationLevel.Device,
  );

  // >>> Añadimos una variable para controlar la visibilidad del botón Orb <<<
  const showOrbButton = false; // Cambia a true si quieres mostrarlo de nuevo
  // >>> Fin de la variable <<<

  const onClickVerify = async (verificationLevel: VerificationLevel) => {
    setButtonState('pending');
    setWhichVerification(verificationLevel);
    const result = await MiniKit.commandsAsync.verify({
      action: 'testing-action', // Make sure to create this in the developer portal -> incognito actions
      verification_level: verificationLevel,
    });
    console.log(result.finalPayload);
    // Verify the proof
    const response = await fetch('/api/verify-proof', {
      method: 'POST',
      body: JSON.stringify({
        payload: result.finalPayload,
        action: 'testing-action',
      }),
    });

    const data = await response.json();
    if (data.verifyRes.success) {
      setButtonState('success');
      // Llamar a la función onSuccess proporcionada por el padre
      onSuccess();
      // Normalmente you'd do something here since the user is verified
      // Here we'll just do nothing
    } else {
      setButtonState('failed');

      // Reset the button state after 3 seconds
      setTimeout(() => {
        setButtonState(undefined);
      }, 2000);
    }
  };

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold"></p>
      <LiveFeedback
        label={{
          failed: 'Failed to verify',
          pending: 'Verifying',
          success: 'Verified',
        }}
        state={
          whichVerification === VerificationLevel.Device
            ? buttonState
            : undefined
        }
        className="w-full"
      >
        <Button
          onClick={() => onClickVerify(VerificationLevel.Device)}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="tertiary"
          className="w-full"
        >
          👁️‍🗨️
        </Button>
      </LiveFeedback>

      {/* >>> Condición para renderizar el botón Orb <<< */}
      {showOrbButton && (
        <LiveFeedback
          label={{
            failed: 'Failed to verify',
            pending: 'Verifying',
            success: 'Verified',
          }}
          state={
            whichVerification === VerificationLevel.Orb ? buttonState : undefined
          }
          className="w-full"
        >
          <Button
            onClick={() => onClickVerify(VerificationLevel.Orb)}
            disabled={buttonState === 'pending'}
            size="lg"
            variant="primary"
            className="w-full"
          >
            Verify (Orb)
          </Button>
        </LiveFeedback>
      )}
      {/* >>> Fin de la condición <<< */}
    </div>
  );
};
