/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {EVENT_TYPES} from '../../../../src/main/resources/META-INF/resources/js/core/actions/eventTypes.es';
import pageLanguageUpdate from '../../../../src/main/resources/META-INF/resources/js/core/thunks/pageLanguageUpdate.es';

const DEFAULT_LANGUAGE_ID = 'en_US';

const createPages = (...instanceIds) => [
	{
		rows: [
			{
				columns: [
					{
						fields: instanceIds.map((instanceId) => ({
							fieldName: 'Text1',
							instanceId,
							localizable: true,
							localizedValue: {[DEFAULT_LANGUAGE_ID]: ''},
							name: `Text1$${instanceId}`,
							type: 'text',
							value: '',
							visible: true,
						})),
					},
				],
			},
		],
	},
];

const mockResponse = (pages) => JSON.stringify({pages});

const updatePageLanguage = async ({getPages, pages}) => {
	const dispatched = [];

	pageLanguageUpdate({
		ddmStructureLayoutId: 1,
		defaultLanguageId: DEFAULT_LANGUAGE_ID,
		getPages,
		nextEditingLanguageId: DEFAULT_LANGUAGE_ID,
		pages,
		portletNamespace: '_portletNamespace_',
		preserveValue: true,
		prevEditingLanguageId: DEFAULT_LANGUAGE_ID,
		readOnly: false,
	})((action) => dispatched.push(action));

	await new Promise((resolve) => setTimeout(resolve, 0));

	return dispatched.filter(
		(action) => action.type === EVENT_TYPES.LANGUAGE.CHANGE
	);
};

const getInstanceIds = (action) =>
	action.payload.pages[0].rows[0].columns[0].fields.map(
		(field) => field.instanceId
	);

describe('pageLanguageUpdate', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		themeDisplay.getSiteGroupId = jest.fn(() => '20126');
	});

	afterEach(() => {
		delete themeDisplay.getSiteGroupId;
	});

	it('applies the response when the pages did not change', async () => {
		const pages = createPages('a');

		fetch.mockResponseOnce(mockResponse(createPages('a')));

		const actions = await updatePageLanguage({
			getPages: () => pages,
			pages,
		});

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(actions).toHaveLength(1);
		expect(getInstanceIds(actions[0])).toEqual(['a']);
	});

	it('does not apply a stale response when the pages changed during the request', async () => {
		const pages = createPages('a');
		const updatedPages = createPages('a', 'b');

		fetch
			.mockResponseOnce(mockResponse(createPages('a')))
			.mockResponseOnce(mockResponse(createPages('a', 'b')));

		const actions = await updatePageLanguage({
			getPages: () => updatedPages,
			pages,
		});

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(actions).toHaveLength(1);
		expect(getInstanceIds(actions[0])).toEqual(['a', 'b']);
	});
});
