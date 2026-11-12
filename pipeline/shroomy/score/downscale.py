"""Spread values from the ~3 km weather points onto the 250 m cells.

Linear interpolation inside the triangle of the 3 nearest points
(precomputed once, then reused for every variable and day).
Cells outside the point cloud take the nearest point.
"""
import numpy as np
from scipy.spatial import Delaunay, cKDTree


class Interpolator:
    def __init__(self, pts_xy: np.ndarray, cells_xy: np.ndarray):
        tri = Delaunay(pts_xy)
        simplex = tri.find_simplex(cells_xy)
        inside = simplex >= 0
        self.n_cells = len(cells_xy)
        self.verts = np.zeros((self.n_cells, 3), int)
        self.w = np.zeros((self.n_cells, 3))
        s = simplex[inside]
        T = tri.transform[s]
        b = np.einsum("ijk,ik->ij", T[:, :2], cells_xy[inside] - T[:, 2])
        self.verts[inside] = tri.simplices[s]
        self.w[inside] = np.c_[b, 1 - b.sum(axis=1)]
        _, nn = cKDTree(pts_xy).query(cells_xy[~inside])
        self.verts[~inside] = nn[:, None]
        self.w[~inside] = [1.0, 0.0, 0.0]

    def __call__(self, values: np.ndarray) -> np.ndarray:
        """values: (n_points,) or (n_points, k) -> (n_cells,) or (n_cells, k)."""
        v = values[self.verts]                    # (cells, 3, ...)
        if v.ndim == 2:
            return np.einsum("ij,ij->i", v, self.w)
        return np.einsum("ijk,ij->ik", v, self.w)
