import { prisma } from '@/lib/prisma';
import { categorySchema } from '@/lib/schemas';
import { z } from 'zod';

type CategoryInput = z.infer<typeof categorySchema>;

export async function getCategoriesService(userId: string) {
    return await prisma.category.findMany({
        where: { userId },
        orderBy: { name: 'asc' }
    });
}

export async function createCategoryService(userId: string, data: CategoryInput) {
    // Valida e garante defaults
    const finalIcon = data.icon || 'Tag';
    const finalType = data.type || 'EXPENSE';

    await prisma.category.create({
        data: {
            userId,
            name: data.name,
            color: data.color,
            icon: finalIcon,
            type: finalType
        }
    });

    return { success: true };
}

export async function deleteCategoryService(userId: string, id: string) {
    // Verifica se a categoria pertence ao usuário antes de deletar
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category || category.userId !== userId) {
        throw new Error('Categoria não encontrada ou sem permissão.');
    }

    await prisma.category.delete({ where: { id } });
    return { success: true };
}