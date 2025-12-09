
import Dexie, { Table } from 'dexie';
import { Message } from '../types';

export class MillaiDatabase extends Dexie {
  public messages!: Table<Message, string>;

  public constructor() {
    super('MillaiDatabase');
    this.version(1).stores({
      messages: 'id, role, text, timestamp',
    });
  }
}

export const db = new MillaiDatabase();
