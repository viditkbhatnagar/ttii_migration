import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// The course_offering table is not present in the production MySQL
// schema. The service is retained as a stub so routes compile; offerings
// in production are modeled via batch / cohorts / course directly, and
// will be re-wired in a later session.

export type OfferingInput = {
  course_id: string;
  program_id?: string | undefined;
  centre_id?: string | undefined;
  title?: string | undefined;
  offering_code?: string | undefined;
  delivery_mode?: string | undefined;
  academic_year?: string | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
  enrollment_start?: string | undefined;
  enrollment_end?: string | undefined;
  max_enrollment?: number | undefined;
  pricing_amount?: number | undefined;
  language_id?: string | undefined;
  status?: string | undefined;
};

export class OfferingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  listOfferings(_filters?: {
    courseId?: string;
    centreId?: string;
    programId?: string;
    status?: string;
  }): Promise<Record<string, unknown>[]> {
    return Promise.resolve([]);
  }

  getOffering(_offeringId: string): Promise<Record<string, unknown> | null> {
    return Promise.resolve(null);
  }

  createOffering(
    _actorUserId: string,
    _input: OfferingInput,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('course_offering table not present in MySQL schema'));
  }

  updateOffering(
    _actorUserId: string,
    _offeringId: string,
    _input: OfferingInput,
  ): Promise<void> {
    return Promise.reject(new Error('course_offering table not present in MySQL schema'));
  }

  deleteOffering(_actorUserId: string, _offeringId: string): Promise<void> {
    return Promise.reject(new Error('course_offering table not present in MySQL schema'));
  }
}
