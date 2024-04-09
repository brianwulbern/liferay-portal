/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {liferayConfig} from '../liferay.config';
import {getRandomInt} from '../utils/getRandomInt';
import {ApiHelpers} from './ApiHelpers';

type TObjectAction = {
	active?: boolean;
	id?: number;
	label: {
		[key: string]: string;
	};
	name: string;
	objectActionExecutorKey: string;
	objectActionTriggerKey: string;
	parameters: {
		[key: string]: number;
	};
};

export class ObjectAdminApiHelper {
	readonly apiHelpers: ApiHelpers;
	readonly basePath: string;

	constructor(apiHelpers: ApiHelpers) {
		this.apiHelpers = apiHelpers;
		this.basePath = 'object-admin/v1.0';
	}

	async deleteObjectAction(objectActionId: number) {
		return this.apiHelpers.delete(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-actions/${objectActionId}`
		);
	}

	async deleteObjectDefinition(objectDefinitionId: number) {
		return this.apiHelpers.delete(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions/${objectDefinitionId}`
		);
	}

	async deleteObjectFolder(objectFolderId: number) {
		return this.apiHelpers.delete(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-folders/${objectFolderId}`
		);
	}

	async deleteObjectRelationship(objectRelationshipId: number) {
		return this.apiHelpers.delete(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-relationships/${objectRelationshipId}`
		);
	}

	async postFormulaObjectField(
		objectFieldLabel: string,
		objectFieldName: string,
		outputValue: string,
		formulaScript: string,
		objectDefinitionId: number
	) {
		const requestBody = {
			DBType: 'String',
			businessType: 'Formula',
			indexed: false,
			indexedAsKeyword: false,
			label: {en_US: objectFieldLabel},
			listTypeDefinitionId: 0,
			name: objectFieldName,
			objectFieldSettings: [
				{
					name: 'output',
					value: outputValue,
				},
				{
					name: 'script',
					value: formulaScript,
				},
			],
			required: false,
		};

		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions/${objectDefinitionId}/object-fields`,
			requestBody
		);
	}

	async postIntegerObjectField(
		objectFieldLabel: string,
		objectFieldName: string,
		objectDefinitionId: number
	) {
		const requestBody = {
			DBType: 'Integer',
			businessType: 'Integer',
			indexed: true,
			indexedAsKeyword: false,
			label: {en_US: objectFieldLabel},
			listTypeDefinitionId: 0,
			name: objectFieldName,
			required: false,
		};

		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions/${objectDefinitionId}/object-fields/`,
			requestBody
		);
	}

	async postObjectDefinition(data: DataObject) {
		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions`,
			data
		);
	}

	async postObjectDefinitionByExternalRefernceCodeObjectAction(
		externalReferenceCode: string,
		objectAction?: TObjectAction
	): Promise<TObjectAction> {
		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions/by-external-reference-code/${externalReferenceCode}/object-actions`,
			objectAction
		);
	}

	async postObjectEntry(
		fieldName: any,
		value: string | number,
		restContextPath: string
	) {
		const requestBody = {
			[fieldName]: value,
		};

		return this.apiHelpers.post(
			`${liferayConfig.environment.baseUrl}${restContextPath}`,
			requestBody
		);
	}

	async postObjectRelationship(
		objectRelationship: Partial<ObjectRelationship>
	) {
		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions/by-external-reference-code/${objectRelationship.objectDefinitionExternalReferenceCode1}/object-relationships`,
			objectRelationship
		);
	}

	async postRandomObjectDefinition(
		objectFolderExternalReferenceCode?: string
	) {
		const objectDefinitionExternalReferenceCode =
			'ObjectDefinition' + getRandomInt();

		const requestBody = {
			active: true,
			externalReferenceCode: objectDefinitionExternalReferenceCode,
			label: {
				en_US: objectDefinitionExternalReferenceCode,
			},
			name: objectDefinitionExternalReferenceCode,
			objectFields: [
				{
					DBType: 'String',
					businessType: 'Text',
					externalReferenceCode: 'textField',
					indexed: true,
					indexedAsKeyword: false,
					indexedLanguageId: '',
					label: {en_US: 'textField'},
					listTypeDefinitionId: 0,
					name: 'textField',
					required: false,
					system: false,
					type: 'String',
				},
			],
			objectFolderExternalReferenceCode,
			pluralLabel: {
				en_US: objectDefinitionExternalReferenceCode,
			},
			scope: 'company',
			status: {code: 0},
		};

		if (objectFolderExternalReferenceCode) {
			requestBody.objectFolderExternalReferenceCode =
				objectFolderExternalReferenceCode;
		}

		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-definitions`,
			requestBody
		);
	}

	async postRandomObjectFolder() {
		const objectFolderExternalReferenceCode =
			'objectFolder' + getRandomInt();

		return this.apiHelpers.post(
			`${this.apiHelpers.baseUrl}${this.basePath}/object-folders`,
			{
				externalReferenceCode: objectFolderExternalReferenceCode,
				label: {
					en_US: objectFolderExternalReferenceCode,
				},
				name: objectFolderExternalReferenceCode,
			}
		);
	}
}
