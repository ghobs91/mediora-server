import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  useGetParamsQuery,
  useUpdateParamsMutation,
  GetParamsDocument,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const organizeLibraryStrategies = [
  {
    value: 'link',
    label: 'Link',
    description: (
      <>
        It will create a symbolic link between the downloaded file and your
        library folder.
        <br />
        This keeps the torrent seeding and deleting the file in your library
        wont delete the original file.
      </>
    ),
  },
  {
    value: 'copy',
    label: 'Copy',
    description: (
      <>
        It will copy the downloaded file to your library, this is useful when
        your system does not supports symbolic links.
        <br />
        This keeps the torrent seeding and deleting the file in your library
        wont delete the original file.
      </>
    ),
  },
  {
    value: 'move',
    label: 'Move',
    description: (
      <>
        It will move the downloaded file to your library, this is useful when
        your system does not supports symbolic links.
        <br />
        This wont keep the torrent seeding and deleting the file in your
        library will be permanent.
      </>
    ),
  },
];

export function SettingsFormComponent() {
  const { data, loading } = useGetParamsQuery();
  const [values, setValues] = useState<Record<string, string>>({});

  const [updateParams, { loading: saving }] = useUpdateParamsMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetParamsDocument }],
    onCompleted: () => toast.success('Settings updated'),
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
  });

  const fields = Object.keys(data?.params || {}).filter(
    (key) => key !== '__typename'
  );

  useEffect(() => {
    if (!data?.params) return;
    const params = data.params as unknown as Record<string, string>;
    setValues(
      Object.fromEntries(
        Object.entries(params).filter(([key]) => key !== '__typename')
      )
    );
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateParams({
      variables: {
        params: Object.entries(values).map(([key, value]) => ({
          key,
          value,
        })),
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <TooltipProvider>
            {fields.map((key) => (
              <ParamsInput
                key={key}
                inputName={key}
                value={values[key]}
                onChange={(value) => handleChange(key, value)}
              />
            ))}
          </TooltipProvider>
          <Button type="submit" disabled={saving}>
            Update
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ParamsInputProps {
  inputName: string;
  value?: string;
  onChange: (value: string) => void;
}

function ParamsInput({ inputName, value, onChange }: ParamsInputProps) {
  if (inputName === 'organize_library_strategy') {
    return (
      <div className="flex flex-col gap-2">
        <Label>{inputName}</Label>
        <div className="flex items-center gap-2">
          {organizeLibraryStrategies.map((strategy) => (
            <Tooltip key={strategy.value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={value === strategy.value ? 'default' : 'outline'}
                  onClick={() => onChange(strategy.value)}
                >
                  {strategy.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {strategy.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`param-${inputName}`}>{inputName}</Label>
      <Input
        id={`param-${inputName}`}
        value={value}
        onChange={({ target }) => onChange(target.value)}
      />
    </div>
  );
}
