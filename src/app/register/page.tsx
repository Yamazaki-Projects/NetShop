
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, InviteInfo } from '../../services/dbService';
import { Card, Button, Input, Badge } from '../../components/UI';
import { useAppContext } from '../providers';
import { UserRole } from '../../types';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isDarkMode } = useAppContext();
  
  const [invite, setInvite] = useState<InviteInfo | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const info = db.validateInvite(code);
      setInvite(info);
    }
  }, [searchParams]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    
    const newUser = db.registerUser(invite.code, name, email);
    if (newUser) {
      setIsSuccess(true);
      setTimeout(() => {
        setUser(newUser);
        router.push('/');
      }, 2000);
    } else {
      setError('登録に失敗しました。招待コードが無効または期限切れの可能性があります。');
    }
  };

  if (!invite && !isSuccess) {
    return (
      <Card className="p-8 text-center max-w-md">
        <i className="fa-solid fa-triangle-exclamation text-amber-500 text-5xl mb-4"></i>
        <h2 className="text-xl font-bold mb-2">招待エラー</h2>
        <p className="text-text-sub mb-6">招待URLが無効、または期限が切れています。管理者に新しいURLの発行を依頼してください。</p>
        <Button onClick={() => router.push('/login')} variant="secondary">ログイン画面へ</Button>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="p-8 text-center max-w-md animate-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">
          <i className="fa-solid fa-check"></i>
        </div>
        <h2 className="text-2xl font-bold mb-2">登録完了</h2>
        <p className="text-text-sub">アカウントの登録が完了しました。ダッシュボードに移動します...</p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-3xl mb-4 shadow-lg shadow-primary/20">
          <i className="fa-solid fa-user-plus"></i>
        </div>
        <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">パートナー登録</h1>
        <p className="text-text-sub dark:text-text-darkSub mt-2">システムへの新規参加を歓迎します</p>
      </div>

      <Card className="p-8">
        <div className="mb-8 text-center">
          <Badge className={invite?.type === UserRole.ADMIN ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}>
            {invite?.type === UserRole.ADMIN ? '管理者として招待されています' : '代理店として招待されています'}
          </Badge>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <Input 
            label="氏名" 
            placeholder="山田 太郎" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input 
            label="メールアドレス" 
            type="email" 
            placeholder="example@test.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full py-3">アカウントを作成</Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-sub">
          アカウント登録後、利用規約に同意したものとみなされます。
        </p>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-sub dark:bg-bg-darkMain">
      <Suspense fallback={<p>読み込み中...</p>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
