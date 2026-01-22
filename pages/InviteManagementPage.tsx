
import React, { useState } from 'react';
import { db } from '../services/dbService';
import { UserRole } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { useAppContext } from '../App';

const InviteManagementPage = () => {
  const { user } = useAppContext();
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [inviteType, setInviteType] = useState<UserRole | null>(null);

  const handleGenerate = (type: UserRole) => {
    const code = db.generateInvite(type, user!);
    const baseUrl = window.location.origin + '/register';
    // SPA では /#/register も考慮する必要があるかもしれませんが、通常は location.pathname をベースにします
    const hashBase = window.location.hash.split('?')[0]; 
    const url = `${window.location.origin}${window.location.pathname}#/register?code=${code}`;
    setGeneratedUrl(url);
    setInviteType(type);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    alert('URLをクリップボードにコピーしました。');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">招待URL管理</h1>
        <p className="text-text-sub dark:text-text-darkSub">新規管理者および代理店をシステムに招待します</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-2xl">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <h2 className="text-lg font-bold">管理者招待</h2>
          <p className="text-sm text-text-sub flex-1">
            システム操作・審査権限を持つ管理者を招待します。
          </p>
          <Button onClick={() => handleGenerate(UserRole.ADMIN)} variant="primary" className="w-full">
            招待URLを発行
          </Button>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 text-2xl">
            <i className="fa-solid fa-users"></i>
          </div>
          <h2 className="text-lg font-bold">代理店招待</h2>
          <p className="text-sm text-text-sub flex-1">
            案件登録を行う代理店を招待します。このURLから登録された代理店はシステム管理者の直下に紐付きます。
          </p>
          <Button onClick={() => handleGenerate(UserRole.AGENCY)} variant="success" className="w-full">
            招待URLを発行
          </Button>
        </Card>
      </div>

      {generatedUrl && (
        <Card className="p-6 bg-primary/5 border-primary/20 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <i className="fa-solid fa-link"></i>
              発行された招待URL ({inviteType === UserRole.ADMIN ? '管理者用' : '代理店用'})
            </h3>
            <Badge className="bg-primary text-white">有効期限: 24時間</Badge>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-lg border border-primary/20 font-mono text-xs break-all overflow-hidden">
              {generatedUrl}
            </div>
            <Button onClick={copyToClipboard} variant="primary" className="shrink-0">
              <i className="fa-solid fa-copy"></i>
            </Button>
          </div>
          <p className="mt-4 text-xs text-text-sub italic">
            ※このURLを招待したいユーザーに送信してください。一度登録されると無効になります。
          </p>
        </Card>
      )}
    </div>
  );
};

export default InviteManagementPage;
