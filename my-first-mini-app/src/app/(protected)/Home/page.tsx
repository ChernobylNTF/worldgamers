// src/app/(protected)/Home/page.tsx
'use client';

import { auth } from '@/auth'; // Si bien esta importación está aquí, si el layout raíz maneja la sesión, no es estrictamente necesaria aquí para el `session` object.
import { Page } from '@/components/PageLayout';
import { Pay } from '@/components/Pay';
import { Transaction } from '@/components/Transaction';
import { UserInfo } from '@/components/UserInfo';
import { Verify } from '@/components/Verify';
import { ViewPermissions } from '@/components/ViewPermissions';
import { Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import Navigation from '@/components/Navigation'; // Importación de la navegación
import { useState, useEffect } from 'react'; // Necesario para el estado del reclamo
import { MiniKit } from '@worldcoin/minikit-js'; // Para comandos de MiniKit
import DWDABI from '@/abi/DWD.json'; // ABI del contrato
import { createPublicClient, http, formatUnits } from 'viem'; // Para interactuar con viem
import { worldchain } from 'viem/chains'; // Cadena de Worldcoin

// Dirección del contrato DWD
const contractAddress = '0x55E6C9C22C0eaD68F0be7CdcB5d8BAa636a8A1a0';

// CID del modelo 3D en IPFS
const coinIpfsUrl = "https://gateway.pinata.cloud/ipfs/bafybeielalf3z7q7x7vngejt53qosizddaltox7laqngxjdqhf2vyn6egq";

export default function Home() {
  const { data: session, status } = useSession();
  const walletAddress = session?.user?.walletAddress;
  const isAuthenticated = status === 'authenticated';

  const [isVerified, setIsVerified] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [dwdBalance, setDwdBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Configurar el cliente viem una vez
  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-sepolia.g.alchemy.com/public'),
  });

  // --- Lógica para verificar y mostrar información ---
  const handleVerificationSuccess = () => {
    setIsVerified(true);
  };

  // --- Lógica para reclamar tokens ---
  const handleClaimTokens = async () => {
    // Validaciones básicas
    if (!isAuthenticated || !isVerified || claiming || timeLeft > 0) {
      return;
    }
    setClaiming(true);
    try {
      // Comando de transacción
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi: DWDABI.abi as any,
            functionName: 'claim',
            args: [],
          },
        ],
      });

      if (finalPayload.status === 'success') {
        console.log('Transaction submitted:', finalPayload.transaction_id);
        const now = Date.now();
        setLastClaimTime(now);
        localStorage.setItem('lastClaimTime', now.toString());
        alert('Tokens reclamados con éxito. Espera 24 horas para el próximo reclamo.');
      } else {
        console.error('Transaction submission failed:', finalPayload);
        alert('Error al reclamar tokens.');
      }
    } catch (error) {
      console.error('Error al reclamar tokens:', error);
      alert('Error al reclamar tokens.');
    } finally {
      setClaiming(false);
    }
  };

  // --- Lógica para obtener el balance de DWD ---
  const fetchDwdBalance = async () => {
    if (!walletAddress || !publicClient) return;
    setLoadingBalance(true);
    try {
      const balance = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: DWDABI.abi as any,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });
      // Formatear el balance (DWD tiene 18 decimales)
      const formattedBalance = formatUnits(balance as bigint, 18);
      setDwdBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching DWD balance:', error);
      setDwdBalance('Error');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Efectos para manejar el tiempo de reclamo y el balance
  useEffect(() => {
    const savedClaimTime = localStorage.getItem('lastClaimTime');
    if (savedClaimTime) {
      setLastClaimTime(parseInt(savedClaimTime, 10));
    }
  }, []);

  useEffect(() => {
    if (lastClaimTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastClaimTime;
        const remaining = 24 * 60 * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          setTimeLeft(0);
          clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [lastClaimTime]);

  useEffect(() => {
    if (walletAddress) {
      fetchDwdBalance();
    }
  }, [walletAddress, publicClient]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    
      {/* Page.Header con modelo 3D y UserInfo */}
      <Page.Header className="p-0 bg-gradient-to-br from-gray-900 to-blue-900 text-white"> {/* Estilos del tema oscuro y texto blanco */}
        <div className="flex items-center justify-between w-full">
          <SpinningCoin ipfsUrl={coinIpfsUrl} /> {/* Modelo 3D a la izquierda */}

          {/* Información del usuario a la derecha */}
          <div className="flex flex-row items-center justify-end gap-4">
            {session ? (
              <>
                <div className="flex flex-col items-end">
                  {/* Nombre de usuario con color específico para contraste */}
                  <span className="text-m font-semibold capitalize text-gray-300"> {/* Ajustado color para contraste */}
                    {session.user?.username}
                  </span>
                  {session.user?.profilePictureUrl && (
                    <CircularIcon size="sm" className="ml-0 -mr-1">
                      <CheckCircleSolid className="text-blue-600" />
                    </CircularIcon>
                  )}
                </div>
                <Marble src={session.user.profilePictureUrl} className="w-12" />
              </>
            ) : (
              <AuthButton /> {/* Botón de login si no hay sesión */}
            )}
          </div>
        </div>
      </Page.Header>

      {/* Contenido principal de la página */}
      <Page.Main className="flex flex-col items-center justify-start gap-4 p-4 bg-gradient-to-br from-gray-900 to-blue-900 text-white min-h-screen">
        {/* Sección de Verificación */}
        {!isAuthenticated && (
          <div className="w-full max-w-sm">
            <AuthButton />
          </div>
        )}

        {isAuthenticated && !isVerified && (
          <div className="w-full max-w-sm">
            <Verify onSuccess={handleVerificationSuccess} />
          </div>
        )}

        {/* Sección de Reclamo de Tokens (si está verificado) */}
        {isAuthenticated && isVerified && ( timeLeft <= 0 ? (
          <div className="w-full max-w-sm">
            <Button
              onClick={handleClaimTokens}
              disabled={claiming || timeLeft > 0}
              size="lg"
              variant="primary"
              className="w-full"
            >
              {claiming ? 'Reclamando...' : 'Reclamar Tokens'}
            </Button>
          </div>
        ) : (
           <div className="w-full max-w-sm text-center">
             <p>Próximo reclamo en:</p>
             <p className="text-xl font-bold">{formatTime(timeLeft)}</p>
           </div>
        ))}

        {/* Información de la billetera solo si está autenticado y verificado */}
        {isAuthenticated && isVerified && (
          <div className="grid w-full gap-4 max-w-sm">
            <p className="text-lg font-semibold">Información de la Billetera</p>
            <div className="flex flex-col gap-2 p-4 border border-gray-700 rounded-lg">
              <p>
                <strong>Dirección:</strong>{' '}
                {walletAddress ? (
                  <a
                    href={`https://worldscan.org/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {walletAddress}
                  </a>
                ) : (
                  'Cargando...'
                )}
              </p>
              <p>
                <strong>Balance DWD:</strong>{' '}
                {loadingBalance
                  ? 'Cargando...'
                  : dwdBalance !== null
                  ? dwdBalance
                  : 'No disponible'}
              </p>
            </div>
          </div>
        )}

      </Page.Main>

      {/* Navegación en el Footer de Page */}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white z-50">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}

// Declaración de tipo para la prop onSuccess en Verify
declare module '../components/Verify' {
  export const Verify: ({ onSuccess }: { onSuccess: () => void }) => JSX.Element;
              }
