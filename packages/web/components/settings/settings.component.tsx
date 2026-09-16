import React from 'react';

import { SettingsFormComponent } from './settings-form.component';
import { ActionsComponents } from './actions.component';
import { QualityParamsComponent } from './quality-params.component';
import { TagsComponent } from './tags.component';
import { LibraryFoldersComponent } from './library-folders.component';
import { ClientApiKeyComponent } from './client-api-key.component';

export function SettingsComponent() {
  return (
    <div className="px-4 pt-12 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-evenly">
          <div className="w-full max-w-[500px]">
            <ClientApiKeyComponent />
            <LibraryFoldersComponent />
            <SettingsFormComponent />
            <TagsComponent />
          </div>
          <div className="w-full max-w-[500px]">
            <ActionsComponents />
            <QualityParamsComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
