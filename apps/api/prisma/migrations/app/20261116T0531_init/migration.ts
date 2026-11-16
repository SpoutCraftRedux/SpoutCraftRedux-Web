#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/00622da1bf4631ea22df253e5281fbb2b63bee7b6848393aba67b5f6c82c671c/contract';
import endContract from '../../snapshots/00622da1bf4631ea22df253e5281fbb2b63bee7b6848393aba67b5f6c82c671c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'promotion_source',
        members: ['tebex', 'staff'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'promotion_status',
        members: ['pending_payment', 'paid', 'cancelled', 'refunded'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'report_reason',
        members: ['offline', 'wrong_info', 'inappropriate', 'scam', 'other'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'report_status',
        members: ['open', 'resolved'],
      }),
      this.createNativeEnumType({ schema: 'public', typeName: 'role', members: ['user', 'staff'] }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'server_state',
        members: ['draft', 'pending', 'approved', 'changes_requested', 'rejected'],
      }),
      this.createTable({
        schema: 'public',
        table: 'promo_products',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('days', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price_label', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sort', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tebex_package_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'promotions',
        columns: [
          col('amount', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('basket_ident', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('buyer_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('currency', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('days', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ends_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paid_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('product_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('server_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', '"promotion_source"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'promotion_source' } },
          }),
          col('starts_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('status', '"promotion_status"', {
            notNull: true,
            default: lit('pending_payment'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'promotion_status' } },
          }),
          col('transaction_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'reports',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', '"report_reason"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'report_reason' } },
          }),
          col('reporter_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolution', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolved_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('server_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"report_status"', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'report_status' } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'server_status',
        columns: [
          col('checked_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('motd', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('online', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('ping_ms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('players_max', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('players_online', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('protocol', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('server_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uptime_24h', 'float4', { codecRef: { codecId: 'pg/float4@1' } }),
          col('version', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['server_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'server_tags',
        columns: [
          col('server_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tag_slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['server_id', 'tag_slug'], { name: 'server_tags_server_id_tag_slug_pk' }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'servers',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('approved_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('banner_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('description', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('discord', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('featured', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('icon_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('listed', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('owner_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pending_revision', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('port', 'int4', {
            notNull: true,
            default: lit(25565),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('review_note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revision_submitted_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('short_description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sort_weight', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('state', '"server_state"', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'server_state' } },
          }),
          col('submitted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-date@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('verified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('verified_target', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('verify_code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sessions',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'settings',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [primaryKey(['key'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'status_checks',
        columns: [
          col('checked_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('online', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('players', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('server_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'tags',
        columns: [
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['slug'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('banned', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"role"', {
            notNull: true,
            default: lit('user'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'role' } },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'servers',
        constraint: 'servers_slug_unique',
        columns: ['slug'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'promotions',
        index: 'promotions_server',
        columns: ['server_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'promotions',
        index: 'promotions_transaction',
        columns: ['transaction_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'promotions',
        index: 'promotions_window',
        columns: ['status', 'starts_at', 'ends_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reports',
        index: 'reports_status',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'servers',
        index: 'servers_owner',
        columns: ['owner_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'servers',
        index: 'servers_state',
        columns: ['state'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sessions',
        index: 'sessions_user',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'status_checks',
        index: 'status_checks_server_time',
        columns: ['server_id', 'checked_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_username_lower',
        expression: sql`lower(username)`,
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'promotions',
        foreignKey: {
          name: 'promotions_server_id_servers_id_fk',
          columns: ['server_id'],
          references: { schema: 'public', table: 'servers', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'promotions',
        foreignKey: {
          name: 'promotions_product_id_promo_products_id_fk',
          columns: ['product_id'],
          references: { schema: 'public', table: 'promo_products', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'promotions',
        foreignKey: {
          name: 'promotions_buyer_id_users_id_fk',
          columns: ['buyer_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reports',
        foreignKey: {
          name: 'reports_server_id_servers_id_fk',
          columns: ['server_id'],
          references: { schema: 'public', table: 'servers', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reports',
        foreignKey: {
          name: 'reports_reporter_id_users_id_fk',
          columns: ['reporter_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'server_status',
        foreignKey: {
          name: 'server_status_server_id_servers_id_fk',
          columns: ['server_id'],
          references: { schema: 'public', table: 'servers', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'server_tags',
        foreignKey: {
          name: 'server_tags_server_id_servers_id_fk',
          columns: ['server_id'],
          references: { schema: 'public', table: 'servers', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'server_tags',
        foreignKey: {
          name: 'server_tags_tag_slug_tags_slug_fk',
          columns: ['tag_slug'],
          references: { schema: 'public', table: 'tags', columns: ['slug'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'servers',
        foreignKey: {
          name: 'servers_owner_id_users_id_fk',
          columns: ['owner_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sessions',
        foreignKey: {
          name: 'sessions_user_id_users_id_fk',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'status_checks',
        foreignKey: {
          name: 'status_checks_server_id_servers_id_fk',
          columns: ['server_id'],
          references: { schema: 'public', table: 'servers', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
