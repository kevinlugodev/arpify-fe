import { inject, Service } from '@angular/core';
import SimpleCrypto, { PlainData } from 'simple-crypto-js';
import { environment } from '../../../environments/environment';

/**
 * Servicio genérico de almacenamiento local encriptado.
 *
 * Abstrae `localStorage` usando `simple-crypto-js` para cifrar/descifrar
 * cualquier tipo de dato `<T>`. Útil para persistir tokens, datos de usuario
 * y otros valores sensibles en el cliente.
 */
@Service()
export class SecureStorage {
  private readonly crypto = new SimpleCrypto(environment.storageSecretKey);

  /**
   * Guarda un valor en `localStorage` de forma encriptada.
   * @param key Clave única del item.
   * @param value Valor a persistir.
   */
  setItem<T extends PlainData>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const encrypted = this.crypto.encrypt(value);
    localStorage.setItem(key, encrypted);
  }

  /**
   * Recupera y descifra un valor de `localStorage`.
   * @param key Clave del item.
   * @returns El valor tipado o `null` si no existe o es inválido.
   */
  getItem<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const encrypted = localStorage.getItem(key);
    if (!encrypted) {
      return null;
    }
    try {
      return this.crypto.decrypt(encrypted) as T;
    } catch {
      return null;
    }
  }

  /**
   * Elimina un item de `localStorage`.
   * @param key Clave del item.
   */
  removeItem(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  }

  /**
   * Limpia todo el `localStorage` gestionado por la aplicación.
   */
  clear(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.clear();
  }
}
