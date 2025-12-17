@echo off
REM Upload your private key to VPS securely
echo ============================================
echo   UPLOADING CHECKPOINT SIGNER KEY
echo ============================================
echo.

REM Upload the key file
scp -i %USERPROFILE%\.ssh\solara_vps1_new C:\Users\mcdan\solaracheckpoint.txt root@80.78.27.27:/solara-core/keys/checkpoint-signer.json

REM Set secure permissions
ssh -i %USERPROFILE%\.ssh\solara_vps1_new root@80.78.27.27 "chmod 600 /solara-core/keys/checkpoint-signer.json && echo 'Key uploaded and secured!' && ls -la /solara-core/keys/"

echo.
echo ============================================
echo   KEY UPLOAD COMPLETE
echo ============================================
pause
