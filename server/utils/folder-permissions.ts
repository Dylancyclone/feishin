import { User } from '@prisma/client';
import { prisma } from '../lib';

export enum Roles {
  NONE = 0,
  GUEST = 1,
  USER = 2,
  ADMIN = 4,
  SUPERADMIN = 8,
}

export enum FolderRoles {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 4,
}

export const folderPermissions = async (serverFolderIds: any[], user: User) => {
  if (user.isAdmin) {
    return true;
  }

  const serverFoldersWithAccess = await prisma.serverFolder.findMany({
    where: {
      OR: [
        {
          AND: [
            {
              serverFolderPermissions: {
                some: { userId: { equals: user.id } },
              },
            },
          ],
        },
      ],
    },
  });

  const serverFoldersWithAccessIds = serverFoldersWithAccess.map(
    (serverFolder) => serverFolder.id
  );

  const hasAccess = serverFolderIds.every((id) =>
    serverFoldersWithAccessIds.includes(id)
  );

  return hasAccess;
};

export const getFolderPermissions = async (user: User) => {
  if (user.isAdmin) {
    const serverFoldersWithAccess = await prisma.serverFolder.findMany();

    const serverFoldersWithAccessIds = serverFoldersWithAccess.map(
      (serverFolder) => serverFolder.id
    );

    return serverFoldersWithAccessIds;
  }

  const serverFoldersWithAccess = await prisma.serverFolder.findMany({
    where: {
      OR: [
        {
          AND: [
            {
              serverFolderPermissions: {
                some: { userId: { equals: user.id } },
              },
            },
          ],
        },
      ],
    },
  });

  const serverFoldersWithAccessIds = serverFoldersWithAccess.map(
    (serverFolder) => serverFolder.id
  );

  return serverFoldersWithAccessIds;
};