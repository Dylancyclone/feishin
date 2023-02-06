import { useCallback, ChangeEvent, MutableRefObject, MouseEvent } from 'react';
import { IDatasource } from '@ag-grid-community/core';
import { Flex, Group, Stack } from '@mantine/core';
import { openModal } from '@mantine/modals';
import {
  RiSortAsc,
  RiSortDesc,
  RiFolder2Line,
  RiFilter3Line,
  RiMoreFill,
  RiSettings3Fill,
} from 'react-icons/ri';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { LibraryItem, SongListQuery, SongListSort, SortOrder } from '/@/renderer/api/types';
import {
  DropdownMenu,
  SONG_TABLE_COLUMNS,
  Button,
  Slider,
  MultiSelect,
  Switch,
  Text,
} from '/@/renderer/components';
import { usePlayQueueAdd } from '/@/renderer/features/player';
import { useMusicFolders } from '/@/renderer/features/shared';
import { JellyfinSongFilters } from '/@/renderer/features/songs/components/jellyfin-song-filters';
import { NavidromeSongFilters } from '/@/renderer/features/songs/components/navidrome-song-filters';
import { useContainerQuery } from '/@/renderer/hooks';
import { queryClient } from '/@/renderer/lib/react-query';
import type { AgGridReact as AgGridReactType } from '@ag-grid-community/react/lib/agGridReact';
import {
  useCurrentServer,
  useSongListStore,
  useSetSongStore,
  useSetSongFilters,
  useSetSongTable,
  useSetSongTablePagination,
  SongListFilter,
} from '/@/renderer/store';
import { ListDisplayType, ServerType, Play, TableColumn } from '/@/renderer/types';

const FILTERS = {
  jellyfin: [
    { defaultOrder: SortOrder.ASC, name: 'Album', value: SongListSort.ALBUM },
    { defaultOrder: SortOrder.ASC, name: 'Album Artist', value: SongListSort.ALBUM_ARTIST },
    { defaultOrder: SortOrder.ASC, name: 'Artist', value: SongListSort.ARTIST },
    { defaultOrder: SortOrder.ASC, name: 'Duration', value: SongListSort.DURATION },
    { defaultOrder: SortOrder.ASC, name: 'Most Played', value: SongListSort.PLAY_COUNT },
    { defaultOrder: SortOrder.ASC, name: 'Name', value: SongListSort.NAME },
    { defaultOrder: SortOrder.ASC, name: 'Random', value: SongListSort.RANDOM },
    { defaultOrder: SortOrder.ASC, name: 'Recently Added', value: SongListSort.RECENTLY_ADDED },
    { defaultOrder: SortOrder.ASC, name: 'Recently Played', value: SongListSort.RECENTLY_PLAYED },
    { defaultOrder: SortOrder.ASC, name: 'Release Date', value: SongListSort.RELEASE_DATE },
  ],
  navidrome: [
    { defaultOrder: SortOrder.ASC, name: 'Album', value: SongListSort.ALBUM },
    { defaultOrder: SortOrder.ASC, name: 'Album Artist', value: SongListSort.ALBUM_ARTIST },
    { defaultOrder: SortOrder.ASC, name: 'Artist', value: SongListSort.ARTIST },
    { defaultOrder: SortOrder.DESC, name: 'BPM', value: SongListSort.BPM },
    { defaultOrder: SortOrder.ASC, name: 'Channels', value: SongListSort.CHANNELS },
    { defaultOrder: SortOrder.ASC, name: 'Comment', value: SongListSort.COMMENT },
    { defaultOrder: SortOrder.DESC, name: 'Duration', value: SongListSort.DURATION },
    { defaultOrder: SortOrder.DESC, name: 'Favorited', value: SongListSort.FAVORITED },
    { defaultOrder: SortOrder.ASC, name: 'Genre', value: SongListSort.GENRE },
    { defaultOrder: SortOrder.ASC, name: 'Name', value: SongListSort.NAME },
    { defaultOrder: SortOrder.DESC, name: 'Play Count', value: SongListSort.PLAY_COUNT },
    { defaultOrder: SortOrder.DESC, name: 'Rating', value: SongListSort.RATING },
    { defaultOrder: SortOrder.DESC, name: 'Recently Added', value: SongListSort.RECENTLY_ADDED },
    { defaultOrder: SortOrder.DESC, name: 'Recently Played', value: SongListSort.RECENTLY_PLAYED },
    { defaultOrder: SortOrder.DESC, name: 'Year', value: SongListSort.YEAR },
  ],
};

const ORDER = [
  { name: 'Ascending', value: SortOrder.ASC },
  { name: 'Descending', value: SortOrder.DESC },
];

interface SongListHeaderFiltersProps {
  customFilters?: Partial<SongListFilter>;
  itemCount?: number;
  tableRef: MutableRefObject<AgGridReactType | null>;
}

export const SongListHeaderFilters = ({
  customFilters,
  itemCount,
  tableRef,
}: SongListHeaderFiltersProps) => {
  const server = useCurrentServer();
  const page = useSongListStore();
  const setPage = useSetSongStore();
  const setFilter = useSetSongFilters();
  const setTable = useSetSongTable();
  const setPagination = useSetSongTablePagination();
  const handlePlayQueueAdd = usePlayQueueAdd();
  const cq = useContainerQuery();

  const musicFoldersQuery = useMusicFolders();

  const sortByLabel =
    (server?.type &&
      (FILTERS[server.type as keyof typeof FILTERS] as { name: string; value: string }[]).find(
        (f) => f.value === page.filter.sortBy,
      )?.name) ||
    'Unknown';

  const sortOrderLabel = ORDER.find((s) => s.value === page.filter.sortOrder)?.name;

  const handleFilterChange = useCallback(
    async (filters?: SongListFilter) => {
      const dataSource: IDatasource = {
        getRows: async (params) => {
          const limit = params.endRow - params.startRow;
          const startIndex = params.startRow;

          const pageFilters = filters || page.filter;

          const query: SongListQuery = {
            limit,
            startIndex,
            ...pageFilters,
            ...customFilters,
          };

          const queryKey = queryKeys.songs.list(server?.id || '', query);

          const songsRes = await queryClient.fetchQuery(
            queryKey,
            async ({ signal }) =>
              api.controller.getSongList({
                query,
                server,
                signal,
              }),
            { cacheTime: 1000 * 60 * 1 },
          );

          const songs = api.normalize.songList(songsRes, server);
          params.successCallback(songs?.items || [], songsRes?.totalRecordCount);
        },
        rowCount: undefined,
      };
      tableRef.current?.api.setDatasource(dataSource);
      tableRef.current?.api.purgeInfiniteCache();
      tableRef.current?.api.ensureIndexVisible(0, 'top');
      setPagination({ currentPage: 0 });
    },
    [customFilters, page.filter, server, setPagination, tableRef],
  );

  const handleSetSortBy = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!e.currentTarget?.value || !server?.type) return;

      const sortOrder = FILTERS[server.type as keyof typeof FILTERS].find(
        (f) => f.value === e.currentTarget.value,
      )?.defaultOrder;

      const updatedFilters = setFilter({
        sortBy: e.currentTarget.value as SongListSort,
        sortOrder: sortOrder || SortOrder.ASC,
      });

      handleFilterChange(updatedFilters);
    },
    [handleFilterChange, server?.type, setFilter],
  );

  const handleSetMusicFolder = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!e.currentTarget?.value) return;

      let updatedFilters = null;
      if (e.currentTarget.value === String(page.filter.musicFolderId)) {
        updatedFilters = setFilter({ musicFolderId: undefined });
      } else {
        updatedFilters = setFilter({ musicFolderId: e.currentTarget.value });
      }

      handleFilterChange(updatedFilters);
    },
    [handleFilterChange, page.filter.musicFolderId, setFilter],
  );

  const handleToggleSortOrder = useCallback(() => {
    const newSortOrder = page.filter.sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
    const updatedFilters = setFilter({ sortOrder: newSortOrder });
    handleFilterChange(updatedFilters);
  }, [page.filter.sortOrder, handleFilterChange, setFilter]);

  const handleSetViewType = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!e.currentTarget?.value) return;
      const display = e.currentTarget.value as ListDisplayType;
      setPage({ list: { ...page, display: e.currentTarget.value as ListDisplayType } });

      if (display === ListDisplayType.TABLE) {
        tableRef.current?.api.paginationSetPageSize(tableRef.current.props.infiniteInitialRowCount);
        setPagination({ currentPage: 0 });
      } else if (display === ListDisplayType.TABLE_PAGINATED) {
        setPagination({ currentPage: 0 });
      }
    },
    [page, setPage, setPagination, tableRef],
  );

  const handleTableColumns = (values: TableColumn[]) => {
    const existingColumns = page.table.columns;

    if (values.length === 0) {
      return setTable({
        columns: [],
      });
    }

    // If adding a column
    if (values.length > existingColumns.length) {
      const newColumn = { column: values[values.length - 1], width: 100 };

      return setTable({ columns: [...existingColumns, newColumn] });
    }

    // If removing a column
    const removed = existingColumns.filter((column) => !values.includes(column.column));
    const newColumns = existingColumns.filter((column) => !removed.includes(column));

    return setTable({ columns: newColumns });
  };

  const handleAutoFitColumns = (e: ChangeEvent<HTMLInputElement>) => {
    setTable({ autoFit: e.currentTarget.checked });

    if (e.currentTarget.checked) {
      tableRef.current?.api.sizeColumnsToFit();
    }
  };

  const handleRowHeight = (e: number) => {
    setTable({ rowHeight: e });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries(queryKeys.songs.list(server?.id || ''));
    handleFilterChange(page.filter);
  };

  const handlePlay = async (play: Play) => {
    if (!itemCount || itemCount === 0) return;
    const query: SongListQuery = { startIndex: 0, ...page.filter };

    handlePlayQueueAdd?.({
      byItemType: {
        id: query,
        type: LibraryItem.SONG,
      },
      play,
    });
  };

  const handleOpenFiltersModal = () => {
    openModal({
      children: (
        <>
          {server?.type === ServerType.NAVIDROME ? (
            <NavidromeSongFilters handleFilterChange={handleFilterChange} />
          ) : (
            <JellyfinSongFilters handleFilterChange={handleFilterChange} />
          )}
        </>
      ),
      title: 'Song Filters',
    });
  };

  return (
    <Flex justify="space-between">
      <Group
        ref={cq.ref}
        spacing="sm"
        w="100%"
      >
        <DropdownMenu position="bottom-start">
          <DropdownMenu.Target>
            <Button
              compact
              fw="600"
              size="md"
              variant="subtle"
            >
              {sortByLabel}
            </Button>
          </DropdownMenu.Target>
          <DropdownMenu.Dropdown>
            {FILTERS[server?.type as keyof typeof FILTERS].map((filter) => (
              <DropdownMenu.Item
                key={`filter-${filter.name}`}
                $isActive={filter.value === page.filter.sortBy}
                value={filter.value}
                onClick={handleSetSortBy}
              >
                {filter.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Dropdown>
        </DropdownMenu>
        <Button
          compact
          fw="600"
          size="md"
          variant="subtle"
          onClick={handleToggleSortOrder}
        >
          {cq.isSm ? (
            sortOrderLabel
          ) : (
            <>
              {page.filter.sortOrder === SortOrder.ASC ? (
                <RiSortAsc size="1.3rem" />
              ) : (
                <RiSortDesc size="1.3rem" />
              )}
            </>
          )}
        </Button>
        {server?.type === ServerType.JELLYFIN && (
          <DropdownMenu position="bottom-start">
            <DropdownMenu.Target>
              <Button
                compact
                fw="600"
                size="md"
                variant="subtle"
              >
                {cq.isSm ? 'Folder' : <RiFolder2Line size="1.3rem" />}
              </Button>
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown>
              {musicFoldersQuery.data?.map((folder) => (
                <DropdownMenu.Item
                  key={`musicFolder-${folder.id}`}
                  $isActive={page.filter.musicFolderId === folder.id}
                  value={folder.id}
                  onClick={handleSetMusicFolder}
                >
                  {folder.name}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Dropdown>
          </DropdownMenu>
        )}
        <Button
          compact
          fw="600"
          size="md"
          variant="subtle"
          onClick={handleOpenFiltersModal}
        >
          {cq.isSm ? 'Filters' : <RiFilter3Line size="1.3rem" />}
        </Button>
        <DropdownMenu position="bottom-start">
          <DropdownMenu.Target>
            <Button
              compact
              fw="600"
              size="md"
              variant="subtle"
            >
              <RiMoreFill size="1.3rem" />
            </Button>
          </DropdownMenu.Target>
          <DropdownMenu.Dropdown>
            <DropdownMenu.Item onClick={() => handlePlay(Play.NOW)}>Play</DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => handlePlay(Play.LAST)}>
              Add to queue
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => handlePlay(Play.NEXT)}>
              Add to queue next
            </DropdownMenu.Item>
            <DropdownMenu.Divider />
            <DropdownMenu.Item onClick={handleRefresh}>Refresh</DropdownMenu.Item>
          </DropdownMenu.Dropdown>
        </DropdownMenu>
      </Group>
      <Group>
        <DropdownMenu position="bottom-start">
          <DropdownMenu.Target>
            <Button
              compact
              size="md"
              variant="subtle"
            >
              <RiSettings3Fill size="1.3rem" />
            </Button>
          </DropdownMenu.Target>
          <DropdownMenu.Dropdown>
            <DropdownMenu.Label>Display type</DropdownMenu.Label>
            <DropdownMenu.Item
              $isActive={page.display === ListDisplayType.TABLE}
              value={ListDisplayType.TABLE}
              onClick={handleSetViewType}
            >
              Table
            </DropdownMenu.Item>
            <DropdownMenu.Item
              $isActive={page.display === ListDisplayType.TABLE_PAGINATED}
              value={ListDisplayType.TABLE_PAGINATED}
              onClick={handleSetViewType}
            >
              Table (paginated)
            </DropdownMenu.Item>
            <DropdownMenu.Divider />
            <DropdownMenu.Label>Item Size</DropdownMenu.Label>
            <DropdownMenu.Item closeMenuOnClick={false}>
              <Slider
                defaultValue={page.table.rowHeight || 0}
                label={null}
                max={100}
                min={25}
                onChangeEnd={handleRowHeight}
              />
            </DropdownMenu.Item>
            <DropdownMenu.Label>Table Columns</DropdownMenu.Label>
            <DropdownMenu.Item
              closeMenuOnClick={false}
              component="div"
              sx={{ cursor: 'default' }}
            >
              <Stack>
                <MultiSelect
                  clearable
                  data={SONG_TABLE_COLUMNS}
                  defaultValue={page.table?.columns.map((column) => column.column)}
                  width={300}
                  onChange={handleTableColumns}
                />
                <Group position="apart">
                  <Text>Auto Fit Columns</Text>
                  <Switch
                    defaultChecked={page.table.autoFit}
                    onChange={handleAutoFitColumns}
                  />
                </Group>
              </Stack>
            </DropdownMenu.Item>
          </DropdownMenu.Dropdown>
        </DropdownMenu>
      </Group>
    </Flex>
  );
};