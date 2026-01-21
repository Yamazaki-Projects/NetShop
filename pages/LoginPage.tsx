
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';

const LoginPage = () => {
  const { setUser, isDarkMode } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = db.login(email, password);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('メールアドレスまたはパスワードが正しくありません。');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'dark bg-bg-darkMain' : 'bg-bg-sub'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-3xl mb-4 shadow-lg shadow-primary/20">
            <i className="fa-solid fa-shop"></i>
          </div>
          <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">NetShop Partner Portal</h1>
          <p className="text-text-sub dark:text-text-darkSub mt-2">管理システムへログイン</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="メールアドレス" 
              type="email" 
              placeholder="example@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="パスワード" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full py-3">ログイン</Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">デモ用情報</h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs space-y-1">
              <p className="text-text-sub"><span className="font-bold">管理者:</span> api18958@gmail.com / aaaa1111</p>
              <p className="text-text-sub"><span className="font-bold">代理店:</span> a@example.com (パスワード不要)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
