/**
 * TypeScript types and interfaces for TeleVault
 */
import { users, storages, files, folders, file_chunks, activities, UserRole, ActivityType } from '@prisma/client'

export type User = users
export type Storage = storages & {
  fileCount?: number
  file_count?: number
  totalSize?: bigint
  total_size?: bigint
  _count?: {
    files: number
    folders: number
  }
  userRole?: string
}
export type File = files
export type Folder = folders
export type FileChunk = file_chunks
export type Activity = activities
export type { UserRole, ActivityType }

// Extended types with relations
export type StorageWithOwner = Storage & {
  owner: User
  _count?: {
    files: number
    folders: number
  }
}

export type FileWithChunks = File & {
  chunks: FileChunk[]
  storage: Storage
  folder?: Folder | null
}

export type FolderWithFiles = Folder & {
  files: File[]
  children?: Folder[]
  storage: Storage
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    username: string
    email: string
  }
}

export interface UploadChunkResponse {
  success: boolean
  chunkIndex: number
  totalChunks: number
  fileId: number
  isComplete: boolean
}

export interface DownloadResponse {
  fileUrl: string
  fileName: string
  mimeType?: string
}

// JWT Payload type
export interface JWTPayload {
  userId: number
  username: string
  email: string
  isAdmin?: boolean
}

// Storage permissions
export type Permission = 'read' | 'write' | 'admin'

export interface StoragePermission {
  userId: number
  storageId: number
  permission: Permission
  grantedAt: Date
  grantedBy: number
}
