import { describe,expect,it } from 'vitest';
import { hashPassword,issueToken,verifyPassword,verifyToken } from '../src/auth.js';
describe('account security primitives',()=>{
 it('hashes and verifies a password while rejecting an incorrect password',()=>{const {salt,hash}=hashPassword('correct horse battery staple');expect(verifyPassword('correct horse battery staple',salt,hash)).toBe(true);expect(verifyPassword('wrong password',salt,hash)).toBe(false)});
 it('signs tokens, validates user identity, and rejects tampering and expiry',()=>{const token=issueToken('user-123','test secret',1000,60000);expect(verifyToken(token,'test secret',2000)).toBe('user-123');expect(verifyToken(token,'other secret',2000)).toBeNull();expect(verifyToken(token,'test secret',62001000)).toBeNull();const [body]=token.split('.');expect(verifyToken(`${body}.invalid`,'test secret',2000)).toBeNull()});
});
