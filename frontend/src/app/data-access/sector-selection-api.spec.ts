import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Sector } from '../models/sector';
import { Submission } from '../models/submission';
import { SectorSelectionApi } from './sector-selection-api';

describe('SectorSelectionApi', () => {
  let service: SectorSelectionApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SectorSelectionApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads sectors from the API', () => {
    const expectedSectors: Sector[] = [
      {
        id: 8,
        parent_id: null,
        name: 'Wood',
      },
      {
        id: 47,
        parent_id: 8,
        name: 'Wooden houses',
      },
    ];

    let receivedSectors: Sector[] | undefined;

    service.getSectors().subscribe((sectors) => {
      receivedSectors = sectors;
    });

    const request = httpTesting.expectOne('/api/sectors');

    expect(request.request.method).toBe('GET');

    request.flush({
      data: expectedSectors,
    });

    expect(receivedSectors).toEqual(expectedSectors);
  });

  it('saves a submission', () => {
    const submission: Submission = {
      name: 'Mari Tamm',
      sector_ids: [581, 341],
      agreed_to_terms: true,
    };

    let receivedSubmission: Submission | undefined;

    service.saveSubmission(submission).subscribe((savedSubmission) => {
      receivedSubmission = savedSubmission;
    });

    const saveRequest = httpTesting.expectOne('/api/submission');

    expect(saveRequest.request.method).toBe('POST');
    expect(saveRequest.request.body).toEqual(submission);

    saveRequest.flush({
      data: submission,
    });

    expect(receivedSubmission).toEqual(submission);
  });

  it('loads the current session submission or returns null when there is none', () => {
    const submission: Submission = {
      name: 'Jaan Kask',
      sector_ids: [55, 269],
      agreed_to_terms: true,
    };

    let receivedSubmission: Submission | null | undefined;

    service.getSubmission().subscribe((savedSubmission) => {
      receivedSubmission = savedSubmission;
    });

    const request = httpTesting.expectOne('/api/submission');

    expect(request.request.method).toBe('GET');

    request.flush({
      data: submission,
    });

    expect(receivedSubmission).toEqual(submission);

    service.getSubmission().subscribe((submission) => {
      receivedSubmission = submission;
    });

    const emptyRequest = httpTesting.expectOne('/api/submission');

    expect(emptyRequest.request.method).toBe('GET');

    emptyRequest.flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    expect(receivedSubmission).toBeNull();
  });
});
