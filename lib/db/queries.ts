import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';
import { ArtifactKind } from '@/components/artifact';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      userId,
      title,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save chat to database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    return await db.select().from(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to get chat from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages to database');
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages from database');
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const existingVotes = await db
      .select()
      .from(vote)
      .where(
        and(eq(vote.chatId, chatId), eq(vote.messageId, messageId)),
      );

    if (existingVotes.length > 0) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(
          and(eq(vote.chatId, chatId), eq(vote.messageId, messageId)),
        );
    }

    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to vote message in database');
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes from database');
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document to database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));
  } catch (error) {
    console.error('Failed to get documents from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);
  } catch (error) {
    console.error('Failed to get document from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    // Delete suggestions first
    const documents = await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), gte(document.createdAt, timestamp)));

    if (documents.length === 0) {
      return;
    }

    for (const doc of documents) {
      await db
        .delete(suggestion)
        .where(
          and(
            eq(suggestion.documentId, doc.id),
            eq(suggestion.documentCreatedAt, doc.createdAt),
          ),
        );
    }

    // Then delete documents
    return await db
      .delete(document)
      .where(and(eq(document.id, id), gte(document.createdAt, timestamp)));
  } catch (error) {
    console.error('Failed to delete documents from database');
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions to database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, documentId))
      .orderBy(desc(document.createdAt))
      .limit(1);

    if (documents.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(suggestion)
      .where(
        and(
          eq(suggestion.documentId, documentId),
          eq(suggestion.documentCreatedAt, documents[0].createdAt),
        ),
      );
  } catch (error) {
    console.error('Failed to get suggestions from database');
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // Get messages to delete
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    if (messagesToDelete.length === 0) {
      return;
    }

    const messageIds = messagesToDelete.map((m) => m.id);

    // Delete votes first
    await db
      .delete(vote)
      .where(
        and(
          eq(vote.chatId, chatId),
          inArray(vote.messageId, messageIds),
        ),
      );

    // Then delete messages
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
  } catch (error) {
    console.error('Failed to delete messages from database');
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db
      .update(chat)
      .set({ visibility })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}