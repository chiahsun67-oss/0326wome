import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { ApiResponse } from '../types';

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { username, new_password } = req.body as { username: string; new_password: string };

  if (!username?.trim() || !new_password?.trim()) {
    res.status(400).json({ success: false, error: '帳號與新密碼為必填' } satisfies ApiResponse);
    return;
  }
  if (new_password.length < 6) {
    res.status(400).json({ success: false, error: '密碼至少需要 6 個字元' } satisfies ApiResponse);
    return;
  }

  try {
    const check = await pool.query(
      'SELECT id FROM users WHERE username=$1 AND active=TRUE',
      [username.trim()]
    );
    if (!check.rowCount) {
      res.status(404).json({ success: false, error: '帳號不存在或已停用，請聯絡管理員' } satisfies ApiResponse);
      return;
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password=$1, updated_at=NOW() WHERE username=$2',
      [hash, username.trim()]
    );

    res.json({ success: true, data: { hash }, message: '密碼已更新' } satisfies ApiResponse<{ hash: string }>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}

export interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  department: string;
  role: 'admin' | 'operator' | 'inspector';
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };

  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ success: false, error: '請輸入帳號與密碼' } satisfies ApiResponse);
    return;
  }

  try {
    const result = await pool.query<UserInfo & { password: string; active: boolean }>(
      `SELECT id, username, password, display_name, department, role, active
       FROM users WHERE username = $1`,
      [username.trim()]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ success: false, error: '帳號不存在' } satisfies ApiResponse);
      return;
    }

    const user = result.rows[0];

    if (!user.active) {
      res.status(403).json({ success: false, error: '帳號已停用，請聯絡管理員' } satisfies ApiResponse);
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: '密碼錯誤' } satisfies ApiResponse);
      return;
    }

    // 更新最後登入時間
    await pool.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const userInfo: UserInfo = {
      id:           user.id,
      username:     user.username,
      display_name: user.display_name,
      department:   user.department,
      role:         user.role,
    };

    res.json({ success: true, data: userInfo } satisfies ApiResponse<UserInfo>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}
