USE [UniversidadDB]
GO
/****** Objeto: Table [dbo].[Tarea] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tarea](
	[id_tarea] [int] IDENTITY(1,1) NOT NULL,
	[id_estudiante] [int] NOT NULL,
	[id_asignatura] [int] NULL,
	[titulo] [varchar](100) NOT NULL,
	[descripcion] [varchar](500) NULL,
	[fecha_limite] [datetime] NOT NULL,
	[estado] [varchar](15) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id_tarea] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Tarea] ADD  DEFAULT ('Pendiente') FOR [estado]
GO
ALTER TABLE [dbo].[Tarea]  WITH CHECK ADD  CONSTRAINT [FK_Tarea_Estudiante] FOREIGN KEY([id_estudiante])
REFERENCES [dbo].[Estudiante] ([id_estudiante])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Tarea] CHECK CONSTRAINT [FK_Tarea_Estudiante]
GO
ALTER TABLE [dbo].[Tarea]  WITH CHECK ADD  CONSTRAINT [FK_Tarea_Asignatura] FOREIGN KEY([id_asignatura])
REFERENCES [dbo].[Asignatura] ([id_asignatura])
GO
ALTER TABLE [dbo].[Tarea] CHECK CONSTRAINT [FK_Tarea_Asignatura]
GO
