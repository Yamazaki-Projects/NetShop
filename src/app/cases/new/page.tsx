
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../providers';
import { db } from '../../../services/dbService';
import { PlatformType, CaseStatus } from '../../../types';
import { Card, Input, Select, Button } from '../../../components/UI';
import MainLayout from '../../../components/MainLayout';

export default function CreateCasePage() {
  const { user } = useAppContext();
  const router = useRouter();

  const [formData, setFormData] = useState({
    customerType: 'individual' as 'individual' | 'corporation',
    customerName: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    platform: PlatformType.RAKUTEN,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName) newErrors.customerName = '顧客名は必須です';
    if (!formData.email) newErrors.email = 'メールアドレスは必須です';
    if (!formData.phone) newErrors.phone = '電話番号は必須です';
    if (formData.customerType === 'corporation' && !formData.companyName) newErrors.companyName = '会社名は必須です';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = (asDraft: boolean) => {
    if (!validate()) return;

    db.createCase({
      ...formData,
      agencyId: user!.agencyId!,
      agencyName: user!.name,
      status: asDraft ? CaseStatus.DRAFT : CaseStatus.SUBMITTED,
    }, user!);

    router.push('/cases');
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">新規案件登録</h1>
          <p className="text-text-sub dark:text-text-darkSub">新規のネットショップ共同運営案件を登録します</p>
        </header>

        <Card className="p-8 space-y-8">
          <section className="space-y-6">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-slate-800">基本情報</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="顧客種別" 
                value={formData.customerType} 
                onChange={(e) => setFormData({...formData, customerType: e.target.value as any})}
              >
                <option value="individual">個人</option>
                <option value="corporation">法人</option>
              </Select>

              <Input 
                label="顧客名 (代表者名)" 
                placeholder="山田 太郎" 
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                error={errors.customerName}
              />

              {formData.customerType === 'corporation' && (
                <Input 
                  label="会社名" 
                  placeholder="株式会社サンプル" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  error={errors.companyName}
                />
              )}

              <Input 
                label="電話番号" 
                placeholder="090-0000-0000" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                error={errors.phone}
              />

              <Input 
                label="メールアドレス" 
                type="email" 
                placeholder="example@test.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
              />

              <div className="md:col-span-2">
                <Input 
                  label="住所" 
                  placeholder="都道府県・市区町村・番地" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-slate-800">運営情報</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="プラットフォーム" 
                value={formData.platform} 
                onChange={(e) => setFormData({...formData, platform: e.target.value as PlatformType})}
              >
                {Object.values(PlatformType).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-text-main dark:text-text-darkMain">備考</label>
                <textarea 
                  className="w-full mt-1 px-4 py-2 rounded-lg border bg-white dark:bg-bg-darkSub border-slate-200 dark:border-slate-800 h-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="特記事項があれば入力してください"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => router.push('/cases')} className="order-2 md:order-1">
              キャンセル
            </Button>
            <div className="flex-1 flex flex-col md:flex-row gap-4 order-1 md:order-2 md:justify-end">
              <Button variant="secondary" onClick={() => handleCreate(true)}>
                下書きとして保存
              </Button>
              <Button variant="primary" onClick={() => handleCreate(false)}>
                登録して提出する
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
