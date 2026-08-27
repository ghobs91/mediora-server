import React from 'react';

import { SettingsFormComponent } from './settings-form.component';
import { ActionsComponents } from './actions.component';
import { QualityParamsComponent } from './quality-params.component';
import { TagsComponent } from './tags.component';

export function SettingsComponent() {
  return (
    <div className="pt-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex justify-evenly">
          <div className="w-[500px]">
            <SettingsFormComponent />
            <TagsComponent />
          </div>
          <div className="w-[500px]">
            <ActionsComponents />
            <QualityParamsComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
